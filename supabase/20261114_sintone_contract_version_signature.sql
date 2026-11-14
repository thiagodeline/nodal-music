-- Garantir que o PDF associado ao aceite exiba a VERSÃO EFETIVAMENTE assinada,
-- inclusive em retomada de geração após falha de upload.
CREATE OR REPLACE FUNCTION public.accept_sintone_contract(p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_template public.contract_templates%rowtype;
  v_signed public.user_contracts%rowtype;
begin
  if v_uid is null or (select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) then
    raise exception 'Acesse sua conta para assinar o contrato.';
  end if;
  select * into v_profile from public.profiles where id=v_uid for update;
  if not found then raise exception 'Cadastro não encontrado.'; end if;
  if v_profile.status not in ('PENDING_CONTRACT','ACTIVE') or not v_profile.onboarding_completed then
    raise exception 'Conclua o cadastro antes de assinar.';
  end if;
  select * into v_signed from public.user_contracts where user_id=v_uid;
  if found then
    return jsonb_build_object('signed_at',v_signed.signed_at,'signed_name',v_signed.signed_name,'artist_name',v_signed.artist_name,'cpf',v_signed.cpf,'cnpj',v_signed.cnpj,'contract_snapshot',v_signed.contract_snapshot,'contract_version',v_signed.contract_version,'pdf_status',v_signed.pdf_status,'user_id',v_uid);
  end if;
  if v_profile.status <> 'PENDING_CONTRACT' then raise exception 'A conta não aguarda assinatura.'; end if;
  if v_profile.account_type is null or v_profile.name is null or (v_profile.cpf is null and v_profile.cnpj is null) then
    raise exception 'Dados pessoais obrigatórios não encontrados.';
  end if;
  select * into v_template from public.contract_templates
  where account_type=v_profile.account_type and active=true
  order by created_at desc limit 1;
  if not found or position('[PREENCHER' in v_template.body)>0 then
    raise exception 'A versão contratual ainda está aguardando aprovação e não pode ser assinada.';
  end if;
  insert into public.user_contracts (
    user_id,signed_name,artist_name,cpf,cnpj,signed_at,ip_address,user_agent,pdf_url,
    contract_version,contract_hash,contract_snapshot,pdf_status
  ) values (
    v_uid, btrim(v_profile.name),v_profile.artist_name,
    case when v_profile.account_type='ARTIST' then v_profile.cpf else null end,
    case when v_profile.account_type='LABEL' then v_profile.cnpj else null end,
    clock_timestamp(), nullif(left(btrim(coalesce(p_ip,'')),45),''),
    nullif(left(btrim(coalesce(p_user_agent,'')),512),''),
    v_uid::text||'/contrato_assinado.pdf',
    v_template.version,encode(extensions.digest(convert_to(v_template.body,'UTF8'),'sha256'),'hex'),v_template.body,'pending'
  )
  returning * into v_signed;
  return jsonb_build_object('signed_at',v_signed.signed_at,'signed_name',v_signed.signed_name,'artist_name',v_signed.artist_name,'cpf',v_signed.cpf,'cnpj',v_signed.cnpj,'contract_snapshot',v_signed.contract_snapshot,'contract_version',v_signed.contract_version,'pdf_status',v_signed.pdf_status,'user_id',v_uid);
end $function$

