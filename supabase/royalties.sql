-- Importação de royalties. Rode no SQL Editor depois do 00_atualizar_tudo.sql (ou dos SQLs anteriores).
-- Usa a tabela "reports" (é a que o painel do artista já lê) como tabela de royalties por plataforma/período.

-- 1) precisão: receitas por faixa podem ter frações de centavo
alter table public.reports alter column revenue type numeric(14,6);
alter table public.profiles add column if not exists saldo_disponivel numeric(14,2) not null default 0;
create index if not exists reports_artist_idx on public.reports(artist_id);
-- uma linha por artista + lançamento + plataforma + mês (é o que permite reimportar o mesmo arquivo sem duplicar)
-- se este comando falhar por duplicados, existem linhas repetidas em "reports": me envie o erro
create unique index if not exists reports_import_key on public.reports (artist_id, coalesce(release_id, '00000000-0000-0000-0000-000000000000'::uuid), platform, month);

-- 2) saldo = royalties recebidos - saques efetuados (mesma conta que o painel do artista faz; saque recusado não conta)
create or replace function public.recalc_balance(p_artist uuid) returns void language sql security definer set search_path = public as $$
  update profiles set saldo_disponivel =
    coalesce((select sum(revenue) from reports where artist_id = p_artist), 0)
  - coalesce((select sum(amount) from withdrawals where artist_id = p_artist and status <> 'rejected'), 0)
  where id = p_artist $$;
revoke execute on function public.recalc_balance(uuid) from public, anon, authenticated;

create or replace function public.trg_balance() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('nodal.skip_balance', true) = '1' then return null; end if; -- a importação recalcula uma vez no fim
  if tg_op in ('INSERT', 'UPDATE') then perform recalc_balance(new.artist_id); end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.artist_id is distinct from new.artist_id) then perform recalc_balance(old.artist_id); end if;
  return null;
end $$;
drop trigger if exists reports_balance on public.reports;
create trigger reports_balance after insert or update or delete on public.reports for each row execute function public.trg_balance();
drop trigger if exists withdrawals_balance on public.withdrawals;
create trigger withdrawals_balance after insert or update or delete on public.withdrawals for each row execute function public.trg_balance();

-- 3) o artista não pode editar o próprio saldo (só o sistema, via gatilho; pg_trigger_depth > 1 = veio de outro gatilho)
create or replace function public.guard_profile_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.saldo_disponivel is distinct from old.saldo_disponivel and pg_trigger_depth() = 1 then raise exception 'O saldo é calculado pelo sistema.'; end if;
  if new.role is distinct from old.role or new.can_release_music is distinct from old.can_release_music then raise exception 'Alteração não permitida.'; end if;
  if new.status is distinct from old.status and not (old.status = 'PENDING_ONBOARDING' and new.status = 'PENDING_CONTRACT') then raise exception 'Alteração de status não permitida.'; end if;
  if old.status <> 'PENDING_ONBOARDING' and (new.account_type is distinct from old.account_type or new.cpf is distinct from old.cpf or new.cnpj is distinct from old.cnpj or new.name is distinct from old.name or new.birth_date is distinct from old.birth_date) then
    raise exception 'Dados cadastrais só podem ser alterados pela equipe. Abra um chamado.'; end if;
  return new;
end $$;

-- 4) importação: acha o artista pelo ISRC (lançamento) ou pelo e-mail, grava (upsert) e recalcula o saldo
create or replace function public.import_royalties(p_rows jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb; v_artist uuid; v_release uuid; v_isrc text; v_email text; v_platform text; v_month date; v_streams bigint; v_rev numeric;
  imported int := 0; errs jsonb := '[]'::jsonb; affected uuid[] := '{}'; a uuid;
begin
  if not public.is_admin() then raise exception 'Acesso restrito a administradores.'; end if;
  perform set_config('nodal.skip_balance', '1', true);
  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      v_artist := null; v_release := null;
      v_isrc := upper(replace(coalesce(r->>'isrc', ''), '-', '')); v_email := lower(trim(coalesce(r->>'email', '')));
      v_platform := trim(r->>'platform'); v_month := (r->>'month')::date; v_streams := (r->>'streams')::bigint; v_rev := (r->>'revenue')::numeric;
      if v_isrc <> '' then
        select id, artist_id into v_release, v_artist from releases where upper(replace(coalesce(isrc, ''), '-', '')) = v_isrc limit 1;
      end if;
      if v_artist is null and v_email <> '' then
        v_release := null;
        select id into v_artist from profiles where lower(email) = v_email limit 1;
        if v_artist is null then select id into v_artist from auth.users where lower(email) = v_email limit 1; end if;
      end if;
      if v_artist is null then
        errs := errs || jsonb_build_object('lines', r->'lines', 'key', coalesce(nullif(v_isrc, ''), v_email), 'platform', v_platform, 'month', r->>'month', 'reason', 'not_found');
        continue;
      end if;
      update reports set streams = v_streams, revenue = v_rev
        where artist_id = v_artist and release_id is not distinct from v_release and platform = v_platform and month = v_month;
      if not found then
        insert into reports(artist_id, release_id, platform, month, streams, revenue) values (v_artist, v_release, v_platform, v_month, v_streams, v_rev);
      end if;
      imported := imported + 1; affected := array_append(affected, v_artist);
    exception when others then
      errs := errs || jsonb_build_object('lines', r->'lines', 'key', coalesce(nullif(v_isrc, ''), v_email), 'platform', v_platform, 'month', r->>'month', 'reason', 'error: ' || sqlerrm);
    end;
  end loop;
  for a in select distinct unnest(affected) loop perform recalc_balance(a); end loop;
  return jsonb_build_object('imported', imported, 'artists', (select count(distinct x) from unnest(affected) x), 'errors', errs);
end $$;
revoke execute on function public.import_royalties(jsonb) from public, anon;
grant execute on function public.import_royalties(jsonb) to authenticated;

-- 5) preenche o saldo de todo mundo agora
update public.profiles p set saldo_disponivel =
  coalesce((select sum(revenue) from public.reports r where r.artist_id = p.id), 0)
  - coalesce((select sum(amount) from public.withdrawals w where w.artist_id = p.id and w.status <> 'rejected'), 0);
