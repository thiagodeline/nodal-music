-- SINTONE /admin — Complementos à estrutura EXISTENTE.
-- Aplicar em staging antes de produção. Receita da planilha = valor líquido do ARTISTA (não bruto da DSP).
-- Relatórios mensais são snapshots: reenviar mesmo mês/plataforma/lançamento SUBSTITUI valores, sem duplicar.

create table if not exists public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles(id) on delete cascade,
  delta numeric(20,6) not null check(delta <> 0),
  reason text not null check(length(trim(reason)) between 10 and 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists balance_adjustments_artist_idx
  on public.balance_adjustments(artist_id,created_at desc);
alter table public.balance_adjustments enable row level security;
revoke all on public.balance_adjustments from anon,authenticated;
grant select on public.balance_adjustments to authenticated;
drop policy if exists balance_adjustments_admin_read on public.balance_adjustments;
create policy balance_adjustments_admin_read on public.balance_adjustments
  for select to authenticated using((select public.is_admin()) and exists(
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'
  ));

-- A coluna profiles.saldo_disponivel já é calculada por triggers nos relatórios e saques.
-- Incluímos ajustes auditáveis na mesma fórmula, sem UPDATE manual direto no saldo.
create or replace function public.recalc_balance(p_artist uuid)
returns void language sql security definer set search_path=public,pg_temp as $$
  update public.profiles set saldo_disponivel =
    coalesce((select sum(revenue) from public.reports where artist_id=p_artist),0)
    + coalesce((select sum(delta) from public.balance_adjustments where artist_id=p_artist),0)
    - coalesce((select sum(amount) from public.withdrawals
       where artist_id=p_artist and status <> 'rejected'),0)
  where id=p_artist;
$$;
revoke all on function public.recalc_balance(uuid) from public,anon,authenticated;

-- Ajuste por SALDO FINAL desejado, nunca por edição direta nem sobrescrita de receitas.
create or replace function public.admin_set_balance(
  p_artist uuid,p_target numeric,p_reason text
) returns numeric language plpgsql security definer
set search_path=public,pg_temp as $$
declare v_current numeric; v_delta numeric;
begin
  if auth.uid() is null or not public.is_admin() or not exists
    (select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'Acesso negado';
  end if;
  if p_target is null or p_target < 0 or p_target > 100000000
     or p_target <> round(p_target,2) then raise exception 'Saldo inválido'; end if;
  if length(trim(coalesce(p_reason,''))) not between 10 and 500 then
    raise exception 'Informe uma justificativa com 10 a 500 caracteres'; end if;
  select saldo_disponivel into v_current from public.profiles
    where id=p_artist and role='artist' for update;
  if not found then raise exception 'Artista não encontrado'; end if;
  v_delta := p_target - v_current;
  if v_delta <> 0 then
    insert into public.balance_adjustments(artist_id,delta,reason,created_by)
      values(p_artist,v_delta,trim(p_reason),auth.uid());
    perform public.recalc_balance(p_artist);
  end if;
  return p_target;
end $$;
revoke all on function public.admin_set_balance(uuid,numeric,text) from public,anon;
grant execute on function public.admin_set_balance(uuid,numeric,text) to authenticated;

-- Atualiza import_royalties EXISTENTE: ISRC, UPC, artist_id ou email.
-- Ambiguidades são recusadas; cada linha é validada; não se credita conta errada.
create or replace function public.import_royalties(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r jsonb; v_artist uuid; v_release uuid; v_override uuid;
  v_isrc text; v_upc text; v_email text; v_platform text;
  v_month date; v_streams bigint; v_rev numeric; v_count int;
  v_report uuid; v_imported int:=0; v_affected uuid[]:='{}';
  v_errors jsonb:='[]'; v_key text; v_item text; a uuid;
begin
  if auth.uid() is null or not public.is_admin() or not exists
     (select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'Acesso negado';
  end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>400 then
    raise exception 'Envie um array de até 400 registros por lote'; end if;
  -- Serializa importações concorrentes: evita duplicação na chave mensal existente.
  perform pg_advisory_xact_lock(hashtext('sintone:import_royalties'));
  perform set_config('nodal.skip_balance','1',true);
  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      v_artist:=null;v_release:=null;v_override:=null;
      v_isrc:=upper(regexp_replace(coalesce(r->>'isrc',''),'[^a-zA-Z0-9]','','g'));
      v_upc:=regexp_replace(coalesce(r->>'upc',''),'[^0-9]','','g');
      v_email:=lower(trim(coalesce(r->>'email','')));
      v_item:=nullif(trim(coalesce(r->>'artist_id','')),'');
      v_key:=coalesce(nullif(v_isrc,''),nullif(v_upc,''),v_item,nullif(v_email,''),'vazio');
      if v_item is not null then v_override:=v_item::uuid; end if;
      v_platform:=trim(coalesce(r->>'platform',''));
      v_month:=(r->>'month')::date;
      v_streams:=(r->>'streams')::bigint;
      v_rev:=(r->>'revenue')::numeric;
      if length(v_platform) not between 1 and 100 or v_month<>date_trunc('month',v_month)::date
        or v_streams<0 or v_streams>1000000000000 or v_rev is null
        or abs(v_rev)>100000000 then raise exception 'Dados de royalties inválidos';end if;

      if v_isrc<>'' then
        select count(*),(array_agg(id))[1],(array_agg(artist_id))[1]
          into v_count,v_release,v_artist from public.releases
          where upper(regexp_replace(coalesce(isrc,''),'[^a-zA-Z0-9]','','g'))=v_isrc;
        if v_count<>1 then raise exception 'ISRC não encontrado ou ambíguo'; end if;
      elsif v_upc<>'' then
        select count(*),(array_agg(id))[1],(array_agg(artist_id))[1]
          into v_count,v_release,v_artist from public.releases
          where regexp_replace(coalesce(upc,''),'[^0-9]','','g')=v_upc;
        if v_count<>1 then raise exception 'UPC não encontrado ou ambíguo (precisa ISRC)';end if;
      end if;
      if v_isrc<>'' and v_upc<>'' and not exists(
        select 1 from public.releases where id=v_release
          and regexp_replace(coalesce(upc,''),'[^0-9]','','g')=v_upc
      ) then raise exception 'UPC e ISRC apontam para lançamentos diferentes'; end if;
      if v_override is not null then
        if v_artist is not null and v_artist<>v_override then
          raise exception 'ID do artista não corresponde ao lançamento';end if;
        v_artist:=v_override;
      end if;
      if v_artist is null and v_email<>'' then
        select id into v_artist from public.profiles where lower(email)=v_email limit 1;
      end if;
      if v_artist is null or not exists
        (select 1 from public.profiles where id=v_artist and role='artist') then
        raise exception 'Artista não encontrado';end if;
      if v_email<>'' and exists(select 1 from public.profiles
        where id=v_artist and lower(email)<>v_email) then
        raise exception 'E-mail e identificador apontam para artistas diferentes';end if;
      select id into v_report from public.reports
        where artist_id=v_artist and release_id is not distinct from v_release
          and platform=v_platform and month=v_month for update;
      if v_report is null then
        insert into public.reports(artist_id,release_id,platform,month,streams,revenue)
          values(v_artist,v_release,v_platform,v_month,v_streams,v_rev);
      else
        update public.reports set streams=v_streams,revenue=v_rev where id=v_report;
      end if;
      v_imported:=v_imported+1;
      v_affected:=array_append(v_affected,v_artist);
    exception when others then
      v_errors:=v_errors||jsonb_build_object('key',v_key,'platform',r->>'platform',
        'month',r->>'month','lines',r->'lines','reason',sqlerrm);
    end;
  end loop;
  perform set_config('nodal.skip_balance','0',true);
  for a in select distinct unnest(v_affected) loop
    perform public.recalc_balance(a);
  end loop;
  return jsonb_build_object('imported',v_imported,
    'artists',(select count(distinct x) from unnest(v_affected) x),'errors',v_errors);
end $$;
revoke all on function public.import_royalties(jsonb) from public,anon;
grant execute on function public.import_royalties(jsonb) to authenticated;

-- Saque atômico, respeitando o saldo manual, royalties e pagamentos já solicitados.
create or replace function public.request_sintone_withdrawal(p_amount numeric,p_pix text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_balance numeric; v_min numeric; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão inválida';end if;
  v_min:=case when (now() at time zone 'America/Sao_Paulo')::date >= date '2027-01-01'
      then 80 else 50 end;
  if p_amount is null or p_amount< v_min or p_amount<>round(p_amount,2)
    or length(trim(coalesce(p_pix,''))) not between 3 and 150 then
    raise exception 'Saque inválido';end if;
  select saldo_disponivel into v_balance from public.profiles
    where id=auth.uid() and role='artist' for update;
  if not found or p_amount>v_balance then raise exception 'Saldo insuficiente';end if;
  update public.profiles set pix_key=trim(p_pix) where id=auth.uid();
  insert into public.withdrawals(artist_id,amount,pix_key)
    values(auth.uid(),p_amount,trim(p_pix)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.request_sintone_withdrawal(numeric,text) from public,anon;
grant execute on function public.request_sintone_withdrawal(numeric,text) to authenticated;