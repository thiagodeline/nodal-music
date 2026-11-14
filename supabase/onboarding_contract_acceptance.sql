-- Contrato eletrônico SINTONE: trilha de auditoria, template imutável por assinatura e PDF privado.
-- Criar o fluxo antes de ativar a versão jurídica. Não ativa minuta com dados faltantes.
create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  account_type public.account_type not null,
  body text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(version,account_type),
  constraint contract_templates_ready check (not active or (length(body) >= 1000 and position('[PREENCHER' in body) = 0))
);
create unique index if not exists contract_templates_one_active_type_idx
 on public.contract_templates(account_type) where active;
alter table public.contract_templates enable row level security;
drop policy if exists contract_templates_read on public.contract_templates;
create policy contract_templates_read on public.contract_templates
 for select to authenticated using(true);
revoke insert,update,delete on public.contract_templates from anon,authenticated;
grant select on public.contract_templates to authenticated;

insert into public.contract_templates (version,account_type,body,active)
values
  ('2026-11','ARTIST','CONTRATO DE ADESÃO À DISTRIBUIÇÃO MUSICAL SINTONE — MINUTA 2026-11

1. IDENTIFICAÇÃO DAS PARTES
DISTRIBUIDORA: SINTONE, pessoa jurídica [PREENCHER: RAZÃO SOCIAL], CNPJ [PREENCHER: CNPJ], com sede em [PREENCHER: ENDEREÇO].
CONTRATANTE: titular autenticado da conta, identificado pelo nome civil, nome artístico/razão social, CPF ou CNPJ e demais dados informados no cadastro. Em nome de selo, o signatário declara possuir poderes de representação.

2. OBJETO
A SINTONE oferece interface digital para cadastro, recebimento e revisão de fonogramas e metadados e, quando a distribuição estiver disponível e o lançamento for aprovado, sua entrega às plataformas parceiras. A aceitação deste instrumento não garante a aprovação do catálogo nem o envio imediato a qualquer plataforma.

3. DIREITOS E AUTORIZAÇÃO
O contratante permanece titular dos direitos que efetivamente possui e concede, enquanto o lançamento estiver ativo, autorização não exclusiva e limitada para receber, armazenar, converter e entregar os materiais às plataformas parceiras e exibir os metadados necessários à distribuição. A presente autorização não transfere a propriedade das obras ou fonogramas.

4. DECLARAÇÕES DO CONTRATANTE
O contratante declara possuir os direitos ou autorizações necessárias sobre gravações, composições, samples, versões, participações, artes e demais materiais; responsabiliza-se pela veracidade dos créditos e metadados e pela obtenção das autorizações cabíveis de terceiros.

5. DISTRIBUIÇÃO, MODERAÇÃO E RETIRADA
A SINTONE pode solicitar correções, rejeitar materiais incompatíveis com políticas das plataformas ou suspender conteúdos que infrinjam direitos ou regras aplicáveis. O contratante pode solicitar retirada, sujeita aos prazos técnicos das plataformas.

6. REPASSES E CONDIÇÕES COMERCIAIS
Comissão da SINTONE: [PREENCHER: PERCENTUAL ACORDADO].
Valor mínimo de saque: [PREENCHER: VALOR].
Prazo de pagamento: [PREENCHER: PRAZO EM DIAS ÚTEIS].
Os valores dependerão de relatórios e repasses efetivamente recebidos das plataformas; estornos justificados e obrigações fiscais serão tratados de acordo com as condições divulgadas e a legislação aplicável.

7. VIGÊNCIA E ENCERRAMENTO
A relação terá duração indeterminada até seu encerramento pelas partes, sem prejuízo do cumprimento de obrigações relativas a lançamentos ainda ativos, valores devidos e reivindicações de direitos de terceiros.

8. DADOS PESSOAIS E REGISTROS
Dados de identidade, documento, data e hora do aceite, endereço IP observado pelo servidor e informações técnicas mínimas podem ser guardados para execução do contrato, segurança e comprovação do aceite, segundo a Política de Privacidade.

9. ACEITE ELETRÔNICO
O contratante confirma que leu o conteúdo integral, que os dados de sua conta lhe pertencem e que o clique no botão de aceite representa sua manifestação de concordância. O aceite constitui registro de assinatura eletrônica simples, associado à conta autenticada, nome, documento e data e hora de servidor. Não é um certificado ICP-Brasil.

10. LEI APLICÁVEL
Aplica-se a legislação brasileira. Foro: [PREENCHER: COMARCA DA SEDE], preservados os direitos do consumidor previstos em lei.

11. CONTATO
Canal oficial da distribuidora: [PREENCHER: E-MAIL DE CONTATO].

IMPORTANTE: ESTA MINUTA NÃO ESTÁ APROVADA PARA ASSINATURA ENQUANTO HOUVER CAMPOS [PREENCHER].',false),
  ('2026-11','LABEL','CONTRATO DE ADESÃO À DISTRIBUIÇÃO MUSICAL SINTONE — MINUTA 2026-11

1. IDENTIFICAÇÃO DAS PARTES
DISTRIBUIDORA: SINTONE, pessoa jurídica [PREENCHER: RAZÃO SOCIAL], CNPJ [PREENCHER: CNPJ], com sede em [PREENCHER: ENDEREÇO].
CONTRATANTE: titular autenticado da conta, identificado pelo nome civil, nome artístico/razão social, CPF ou CNPJ e demais dados informados no cadastro. Em nome de selo, o signatário declara possuir poderes de representação.

2. OBJETO
A SINTONE oferece interface digital para cadastro, recebimento e revisão de fonogramas e metadados e, quando a distribuição estiver disponível e o lançamento for aprovado, sua entrega às plataformas parceiras. A aceitação deste instrumento não garante a aprovação do catálogo nem o envio imediato a qualquer plataforma.

3. DIREITOS E AUTORIZAÇÃO
O contratante permanece titular dos direitos que efetivamente possui e concede, enquanto o lançamento estiver ativo, autorização não exclusiva e limitada para receber, armazenar, converter e entregar os materiais às plataformas parceiras e exibir os metadados necessários à distribuição. A presente autorização não transfere a propriedade das obras ou fonogramas.

4. DECLARAÇÕES DO CONTRATANTE
O contratante declara possuir os direitos ou autorizações necessárias sobre gravações, composições, samples, versões, participações, artes e demais materiais; responsabiliza-se pela veracidade dos créditos e metadados e pela obtenção das autorizações cabíveis de terceiros.

5. DISTRIBUIÇÃO, MODERAÇÃO E RETIRADA
A SINTONE pode solicitar correções, rejeitar materiais incompatíveis com políticas das plataformas ou suspender conteúdos que infrinjam direitos ou regras aplicáveis. O contratante pode solicitar retirada, sujeita aos prazos técnicos das plataformas.

6. REPASSES E CONDIÇÕES COMERCIAIS
Comissão da SINTONE: [PREENCHER: PERCENTUAL ACORDADO].
Valor mínimo de saque: [PREENCHER: VALOR].
Prazo de pagamento: [PREENCHER: PRAZO EM DIAS ÚTEIS].
Os valores dependerão de relatórios e repasses efetivamente recebidos das plataformas; estornos justificados e obrigações fiscais serão tratados de acordo com as condições divulgadas e a legislação aplicável.

7. VIGÊNCIA E ENCERRAMENTO
A relação terá duração indeterminada até seu encerramento pelas partes, sem prejuízo do cumprimento de obrigações relativas a lançamentos ainda ativos, valores devidos e reivindicações de direitos de terceiros.

8. DADOS PESSOAIS E REGISTROS
Dados de identidade, documento, data e hora do aceite, endereço IP observado pelo servidor e informações técnicas mínimas podem ser guardados para execução do contrato, segurança e comprovação do aceite, segundo a Política de Privacidade.

9. ACEITE ELETRÔNICO
O contratante confirma que leu o conteúdo integral, que os dados de sua conta lhe pertencem e que o clique no botão de aceite representa sua manifestação de concordância. O aceite constitui registro de assinatura eletrônica simples, associado à conta autenticada, nome, documento e data e hora de servidor. Não é um certificado ICP-Brasil.

10. LEI APLICÁVEL
Aplica-se a legislação brasileira. Foro: [PREENCHER: COMARCA DA SEDE], preservados os direitos do consumidor previstos em lei.

11. CONTATO
Canal oficial da distribuidora: [PREENCHER: E-MAIL DE CONTATO].

IMPORTANTE: ESTA MINUTA NÃO ESTÁ APROVADA PARA ASSINATURA ENQUANTO HOUVER CAMPOS [PREENCHER].',false)
on conflict(version,account_type) do nothing;

alter table public.user_contracts
 add column if not exists artist_name text,
 add column if not exists cpf text,
 add column if not exists cnpj text,
 add column if not exists contract_version text,
 add column if not exists contract_hash text,
 add column if not exists contract_snapshot text,
 add column if not exists user_agent text,
 add column if not exists pdf_status text not null default 'pending',
 add column if not exists pdf_sha256 text,
 add column if not exists pdf_size bigint,
 add column if not exists pdf_uploaded_at timestamptz;
alter table public.user_contracts drop constraint if exists user_contracts_pdf_status_check;
alter table public.user_contracts add constraint user_contracts_pdf_status_check
 check (pdf_status in ('pending','ready'));
alter table public.user_contracts drop constraint if exists user_contracts_pdf_size_check;
alter table public.user_contracts add constraint user_contracts_pdf_size_check
 check (pdf_size is null or (pdf_size between 200 and 10485760));
-- Os artistas podem ver seus registros; inserir/editar assinatura diretamente via Data API não é permitido.
drop policy if exists contracts_insert_own on public.user_contracts;
revoke insert,update,delete on public.user_contracts from anon,authenticated;
-- Preserva administração via RLS (a role admin recebe permissão por GRANT para operar via Data API).
grant select on public.user_contracts to authenticated;
grant insert,update,delete on public.user_contracts to authenticated;

create or replace function public.accept_sintone_contract(p_ip text default null,p_user_agent text default null)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
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
    return jsonb_build_object('signed_at',v_signed.signed_at,'signed_name',v_signed.signed_name,'artist_name',v_signed.artist_name,'cpf',v_signed.cpf,'cnpj',v_signed.cnpj,'contract_snapshot',v_signed.contract_snapshot,'pdf_status',v_signed.pdf_status,'user_id',v_uid);
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
  return jsonb_build_object('signed_at',v_signed.signed_at,'signed_name',v_signed.signed_name,'artist_name',v_signed.artist_name,'cpf',v_signed.cpf,'cnpj',v_signed.cnpj,'contract_snapshot',v_signed.contract_snapshot,'pdf_status',v_signed.pdf_status,'user_id',v_uid);
end $$;

create or replace function public.finalize_sintone_contract_pdf(p_sha256 text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_signed public.user_contracts%rowtype;
  v_size bigint;
  v_mime text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_signed from public.user_contracts where user_id=v_uid for update;
  if not found then raise exception 'Assinatura não registrada.'; end if;
  if v_signed.pdf_status='ready' then return jsonb_build_object('ok',true,'pdf_status','ready'); end if;
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
  update public.profiles set contract_accepted_at=v_signed.signed_at
  where id=v_uid and status='PENDING_CONTRACT';
  return jsonb_build_object('ok',true,'pdf_status','ready');
end $$;

revoke all on function public.accept_sintone_contract(text,text) from public,anon;
revoke all on function public.finalize_sintone_contract_pdf(text) from public,anon;
grant execute on function public.accept_sintone_contract(text,text) to authenticated;
grant execute on function public.finalize_sintone_contract_pdf(text) to authenticated;
