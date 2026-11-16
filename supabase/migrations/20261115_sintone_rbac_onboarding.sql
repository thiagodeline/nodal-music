-- SINTONE: acesso baseado em cargos, ativação pós-PDF e catálogo canônico de DSPs.
-- Migrações correspondentes já foram aplicadas em produção em 2026-11-15.
-- Execute em um ambiente novo somente após as migrações-base que criam as tabelas existentes.
begin;
create table if not exists public.admin_user_roles(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 email text not null,
 role text not null check(role in ('admin','qc_specialist','ingestion_manager','customer_success','a_and_r','royalty_financial')),
 created_at timestamptz not null default now(),unique(user_id,role)
);
create index if not exists admin_user_roles_user_idx on public.admin_user_roles(user_id);
alter table public.admin_user_roles enable row level security;
revoke all on public.admin_user_roles from anon,authenticated;
grant select on public.admin_user_roles to authenticated;
drop policy if exists admin_user_roles_self_read on public.admin_user_roles;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and (
   (coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
   or exists(select 1 from public.admin_user_roles r where r.user_id=auth.uid() and r.role='admin')
 );
$function$
;
CREATE OR REPLACE FUNCTION public.has_admin_role(p_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and (public.is_admin() or
  exists(select 1 from public.admin_user_roles r where r.user_id=auth.uid() and r.role=p_role));
$function$
;
create policy admin_user_roles_self_read on public.admin_user_roles for select to authenticated
 using(user_id=auth.uid() or public.is_admin());
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated,anon;
revoke all on function public.has_admin_role(text) from public,anon;
grant execute on function public.has_admin_role(text) to authenticated,anon;
CREATE OR REPLACE FUNCTION public.manage_sintone_team_roles(p_email text, p_roles text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare target uuid; clean_email text:=lower(trim(p_email)); r text;
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 if length(clean_email) not between 5 and 254
    or p_roles is null or coalesce(array_length(p_roles,1),0)>6
    or exists(select 1 from unnest(p_roles) role where role not in
       ('admin','qc_specialist','ingestion_manager','customer_success','a_and_r','royalty_financial'))
 then raise exception 'E-mail ou cargos inválidos';end if;
 select id into target from auth.users where lower(email)=clean_email and deleted_at is null;
 if target is null then raise exception 'Conta não encontrada';end if;
 if target=auth.uid() and not 'admin'=any(p_roles) and
    not exists(select 1 from public.profiles where id=target and role='admin')
 then raise exception 'Não remova o próprio acesso administrativo'; end if;
 delete from public.admin_user_roles where user_id=target;
 foreach r in array p_roles loop
  insert into public.admin_user_roles(user_id,email,role) values(target,clean_email,r);
 end loop;
end $function$
;
revoke all on function public.manage_sintone_team_roles(text,text[]) from public,anon;
grant execute on function public.manage_sintone_team_roles(text,text[]) to authenticated;
drop policy if exists roles_releases_read on public.releases;
create policy roles_releases_read on public.releases for select to authenticated using(public.has_admin_role('qc_specialist') or public.has_admin_role('ingestion_manager'));
drop policy if exists roles_tracks_read on public.release_tracks;
create policy roles_tracks_read on public.release_tracks for select to authenticated using(public.has_admin_role('qc_specialist') or public.has_admin_role('ingestion_manager'));
drop policy if exists roles_profiles_read on public.profiles;
create policy roles_profiles_read on public.profiles for select to authenticated using(public.has_admin_role('a_and_r') or public.has_admin_role('royalty_financial'));
drop policy if exists roles_contract_read on public.user_contracts;
create policy roles_contract_read on public.user_contracts for select to authenticated using(public.has_admin_role('a_and_r'));
drop policy if exists roles_tickets_read on public.tickets;
create policy roles_tickets_read on public.tickets for select to authenticated using(public.has_admin_role('customer_success'));
drop policy if exists roles_ticket_messages_read on public.ticket_messages;
create policy roles_ticket_messages_read on public.ticket_messages for select to authenticated using(public.has_admin_role('customer_success'));
drop policy if exists roles_artist_profiles_read on public.artist_profiles;
create policy roles_artist_profiles_read on public.artist_profiles for select to authenticated using(public.has_admin_role('a_and_r'));
drop policy if exists roles_reports_read on public.reports;
create policy roles_reports_read on public.reports for select to authenticated using(public.has_admin_role('royalty_financial'));
drop policy if exists roles_withdrawals_read on public.withdrawals;
create policy roles_withdrawals_read on public.withdrawals for select to authenticated using(public.has_admin_role('royalty_financial'));
drop policy if exists roles_releases_update on public.releases;
drop policy if exists roles_profiles_update on public.profiles;
drop policy if exists roles_reports_update on public.reports;
drop policy if exists roles_withdrawals_update on public.withdrawals;
drop policy if exists roles_tickets_update on public.tickets;
drop policy if exists roles_contract_storage_download on storage.objects;
create policy roles_contract_storage_download on storage.objects for select to authenticated
 using(bucket_id='contracts' and public.has_admin_role('a_and_r'));
drop policy if exists roles_audio_storage_read on storage.objects;
create policy roles_audio_storage_read on storage.objects for select to authenticated
 using(bucket_id='audio' and public.has_admin_role('qc_specialist'));

CREATE OR REPLACE FUNCTION public.finalize_sintone_contract_pdf(p_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_signed public.user_contracts%rowtype;
  v_size bigint;
  v_mime text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_signed from public.user_contracts where user_id=v_uid for update;
  if not found then raise exception 'Assinatura não registrada.'; end if;
  if v_signed.pdf_status='ready' then
    update public.profiles set status='ACTIVE',can_release_music=true,contract_accepted_at=v_signed.signed_at
    where id=v_uid and status='PENDING_CONTRACT';
    return jsonb_build_object('ok',true,'pdf_status','ready');
  end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'Hash inválido.'; end if;
  select (metadata->>'size')::bigint, lower(coalesce(metadata->>'mimetype',''))
    into v_size,v_mime from storage.objects
    where bucket_id='contracts' and name=v_uid::text||'/contrato_assinado.pdf';
  if not found or v_size is null or v_size < 200 or v_size > 10485760 or v_mime <> 'application/pdf' then
    raise exception 'PDF assinado não foi encontrado ou é inválido.';
  end if;
  update public.user_contracts
  set pdf_status='ready',pdf_sha256=p_sha256,pdf_size=v_size,pdf_uploaded_at=now()
  where user_id=v_uid and pdf_status='pending';
  update public.profiles set status='ACTIVE',can_release_music=true,contract_accepted_at=v_signed.signed_at
  where id=v_uid and status='PENDING_CONTRACT';
  return jsonb_build_object('ok',true,'pdf_status','ready');
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if auth.uid() is null or public.is_admin() then return new;end if;
 if new.role is distinct from old.role then raise exception 'Cargo da conta protegido';end if;
 if new.saldo_disponivel is distinct from old.saldo_disponivel and pg_trigger_depth()=1 then
  raise exception 'Saldo calculado pelo sistema';end if;
 if public.has_admin_role('a_and_r') and old.id<>auth.uid() then
  if new.can_release_music is distinct from old.can_release_music and
   not (new.status='ACTIVE' and exists(select 1 from public.user_contracts where user_id=new.id and pdf_status='ready'))
  then raise exception 'Liberação exige contrato finalizado';end if;
  return new;
 end if;
 if new.status is distinct from old.status or new.can_release_music is distinct from old.can_release_music then
  if not (old.status='PENDING_ONBOARDING' and new.status='PENDING_CONTRACT' and
     new.can_release_music is not distinct from old.can_release_music)
     and not (old.status='PENDING_CONTRACT' and new.status='ACTIVE' and new.can_release_music=true
       and exists(select 1 from public.user_contracts where user_id=new.id and pdf_status='ready'))
  then raise exception 'Transição de status não autorizada';end if;
 end if;
 if old.status<>'PENDING_ONBOARDING' and
   (new.account_type is distinct from old.account_type or new.cpf is distinct from old.cpf
    or new.cnpj is distinct from old.cnpj or new.name is distinct from old.name
    or new.birth_date is distinct from old.birth_date) then
   raise exception 'Dados cadastrais protegidos';end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.sintone_moderate_release(p_id uuid, p_decision text, p_reason text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
 if not public.has_admin_role('qc_specialist') then raise exception 'Acesso negado';end if;
 if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida';end if;
 if p_decision='rejected' and length(trim(p_reason)) not between 10 and 1500 then raise exception 'Informe o motivo';end if;
 update public.releases set status=p_decision,
 rejection_reason=case when p_decision='rejected' then trim(p_reason) else null end,
 reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_id and status=any(case when p_decision='approved' then array['pending','rejected'] else array['pending','approved'] end);
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Lançamento não disponível';end if;
 return n;
end $function$
;
revoke all on function public.sintone_moderate_release(uuid,text,text) from public,anon;
grant execute on function public.sintone_moderate_release(uuid,text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.sintone_set_delivery_status(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.has_admin_role('ingestion_manager') then raise exception 'Acesso negado';end if;
 if p_status not in ('awaiting','sent','live') then raise exception 'Status inválido';end if;
 update public.releases set delivery_status=p_status,
  delivered_at=case when p_status='awaiting' then null else now() end
 where id=p_id and (p_status='awaiting' or status in ('approved','live'));
 if not found then raise exception 'Lançamento não elegível';end if;
end $function$
;
revoke all on function public.sintone_set_delivery_status(uuid,text) from public,anon;
grant execute on function public.sintone_set_delivery_status(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.sintone_close_ticket(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.has_admin_role('customer_success') then raise exception 'Acesso negado';end if;
 update public.tickets set status='closed' where id=p_id and status<>'closed';
 if not found then raise exception 'Ticket não encontrado ou encerrado';end if;
end $function$
;
revoke all on function public.sintone_close_ticket(uuid) from public,anon;
grant execute on function public.sintone_close_ticket(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.sintone_edit_artist(p_id uuid, p_values jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles%rowtype;
begin
 if not public.has_admin_role('a_and_r') then raise exception 'Acesso negado';end if;
 if jsonb_typeof(p_values)<>'object' or p_values->>'status' not in
 ('PENDING_ONBOARDING','PENDING_CONTRACT','ACTIVE','BLOCKED')
 or exists(select 1 from jsonb_object_keys(p_values) k where k not in
 ('name','artist_name','phone','address','birth_date','cpf','cnpj','status')) then
 raise exception 'Dados inválidos';end if;
 select * into r from public.profiles where id=p_id and role='artist' for update;
 if not found then raise exception 'Artista não encontrado';end if;
 if p_values->>'status'='ACTIVE' and not exists(select 1 from public.user_contracts where user_id=p_id and pdf_status='ready')
 then raise exception 'Contrato finalizado obrigatório';end if;
 update public.profiles set
 name=nullif(left(trim(p_values->>'name'),160),''),
 artist_name=nullif(left(trim(p_values->>'artist_name'),160),''),
 phone=nullif(left(trim(p_values->>'phone'),35),''),
 address=nullif(left(trim(p_values->>'address'),500),''),
 birth_date=nullif(p_values->>'birth_date','')::date,
 cpf=nullif(p_values->>'cpf',''),
 cnpj=nullif(p_values->>'cnpj',''),
 status=(p_values->>'status')::public.account_status,
 onboarding_completed=(p_values->>'status'<>'PENDING_ONBOARDING'),
 can_release_music=(p_values->>'status'='ACTIVE')
 where id=p_id;
end $function$
;
revoke all on function public.sintone_edit_artist(uuid,jsonb) from public,anon;
grant execute on function public.sintone_edit_artist(uuid,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_bulk_delivery_status(p_release_ids uuid[], p_status text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
 if not public.has_admin_role('ingestion_manager') then raise exception 'Acesso negado';end if;
 if p_release_ids is null or array_length(p_release_ids,1) not between 1 and 100
   or p_status not in ('awaiting','sent','live')
   or (select count(distinct x) from unnest(p_release_ids) x)<>array_length(p_release_ids,1)
 then raise exception 'Seleção inválida';end if;
 if (select count(*) from public.releases where id=any(p_release_ids))<>array_length(p_release_ids,1)
 then raise exception 'Há lançamentos não encontrados';end if;
 if p_status<>'awaiting' and exists(
  select 1 from public.releases where id=any(p_release_ids) and status not in ('approved','live')
 ) then raise exception 'Não é permitido marcar envio de lançamento ainda não aprovado';end if;
 update public.releases set delivery_status=p_status,
  delivered_at=case when p_status='awaiting' then null else now() end
 where id=any(p_release_ids);
 get diagnostics n=row_count;
 return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_mark_manual_payout(p_withdrawal_id uuid, p_receipt_reference text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid;
begin
 if not public.has_admin_role('royalty_financial') then raise exception 'Acesso negado';end if;
 if length(trim(coalesce(p_receipt_reference,''))) not between 8 and 240 then raise exception 'Referência do comprovante inválida';end if;
 update public.withdrawals set status='paid'
 where id=p_withdrawal_id and status='pending' returning artist_id into v_user;
 if v_user is null then raise exception 'Saque não encontrado ou já processado';end if;
 insert into public.admin_payout_audit(withdrawal_id,admin_id,operation,receipt_reference)
 values(p_withdrawal_id,auth.uid(),'mark_paid',trim(p_receipt_reference));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_balance(p_artist uuid, p_target numeric, p_reason text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_current numeric; v_delta numeric;
begin
  if auth.uid() is null or not public.is_admin() then
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
end $function$
;

CREATE OR REPLACE FUNCTION public.import_royalties(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r jsonb; v_artist uuid; v_release uuid; v_override uuid;
  v_isrc text; v_upc text; v_email text; v_platform text;
  v_month date; v_streams bigint; v_rev numeric; v_count int;
  v_report uuid; v_track uuid; v_imported int:=0; v_affected uuid[]:='{}';
  v_errors jsonb:='[]'; v_key text; v_item text; a uuid;
begin
  if auth.uid() is null or not public.has_admin_role('royalty_financial') then
    raise exception 'Acesso negado';
  end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>400 then
    raise exception 'Envie um array de até 400 registros por lote'; end if;
  -- Serializa importações concorrentes: evita duplicação na chave mensal existente.
  perform pg_advisory_xact_lock(hashtext('sintone:import_royalties'));
  perform set_config('nodal.skip_balance','1',true);
  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      v_artist:=null;v_release:=null;v_override:=null;v_track:=null;
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
        select count(*),(array_agg(rt.id))[1],(array_agg(rt.release_id))[1],
          (array_agg(rel.artist_id))[1]
          into v_count,v_track,v_release,v_artist
          from public.release_tracks rt
          join public.releases rel on rel.id=rt.release_id
          where upper(regexp_replace(coalesce(rt.isrc,''),'[^a-zA-Z0-9]','','g'))=v_isrc;
        if v_count=0 then
          select count(*),(array_agg(id))[1],(array_agg(artist_id))[1]
            into v_count,v_release,v_artist from public.releases
            where upper(regexp_replace(coalesce(isrc,''),'[^a-zA-Z0-9]','','g'))=v_isrc;
        end if;
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
          and track_id is not distinct from v_track
          and platform=v_platform and month=v_month for update;
      if v_report is null then
        insert into public.reports(artist_id,release_id,track_id,platform,month,streams,revenue)
          values(v_artist,v_release,v_track,v_platform,v_month,v_streams,v_rev);
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
end $function$
;

CREATE OR REPLACE FUNCTION public.reply_to_ticket(p_ticket_id uuid, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_admin_role('customer_success') then raise exception 'Acesso negado'; end if;
  if p_body is null or length(trim(p_body)) not between 1 and 3000 then raise exception 'Mensagem inválida'; end if;
  update public.tickets set status='in_progress'
  where id=p_ticket_id and status <> 'closed';
  if not found then raise exception 'Ticket não encontrado ou fechado'; end if;
  insert into public.ticket_messages(ticket_id,author_id,sender_role,body)
  values(p_ticket_id,auth.uid(),'admin',trim(p_body));
end;
$function$
;

-- Normalizar somente configurações e seleções legadas; pagamentos confirmados permanecem imutáveis.
update public.dsp_settings set name='Instagram',slug='instagram',category='social',is_extra=false,extra_fee=0
 where name='Facebook' and not exists(select 1 from public.dsp_settings where name='Instagram');
delete from public.dsp_settings where name in
 ('Facebook Audio Library','Facebook Fingerprinting','Facebook Video','Facebook Video Figerprint','Apple Music 1');
update public.billing_plans set instagram_addon_fee=0 where instagram_addon_fee<>0;

alter table public.dashboard_banners add column if not exists expires_at timestamptz;
create index if not exists dashboard_banners_expiry on public.dashboard_banners(expires_at) where active;
CREATE OR REPLACE FUNCTION public.sintone_ticket_contacts()
 RETURNS TABLE(user_id uuid, contact_name text, artist_name text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select p.id,p.name,p.artist_name,p.email
 from public.profiles p
 where public.has_admin_role('customer_success')
   and exists(select 1 from public.tickets t where t.user_id=p.id)
$function$
;
revoke all on function public.sintone_ticket_contacts() from public,anon;
grant execute on function public.sintone_ticket_contacts() to authenticated;
commit;
