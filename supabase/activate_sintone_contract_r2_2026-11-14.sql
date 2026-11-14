-- SINTONE — ativação operacional da versão 2026.11-R2
-- Autorizada pelo titular da distribuidora em 14/11/2026.
-- Não modifica o corpo do documento, assinaturas ou versões históricas.
-- Os textos Artista/Selo já foram conferidos contra docs/contratos/sintone-contrato-2026-11-r2.txt.

begin;
do $verify$
declare n integer;
begin
  select count(*) into n from public.contract_templates
  where version='2026.11-R2'
    and account_type in ('ARTIST','LABEL')
    and length(body)>=1000
    and position('[PREENCHER' in body)=0
    and position('SINTONE, nome comercial' in body)>0
    and position('64.100.398/0001-10' in body)>0
    and position('suporte@sintone.com.br' in body)>0
    and position('THYAGO ESPINDOLA DE MELO' in body)=0;
  if n<>2 then raise exception 'Documentos R2 não validados: % de 2',n; end if;
end $verify$;
update public.contract_templates set active=false
where account_type in ('ARTIST','LABEL') and active;
update public.contract_templates set active=true
where version='2026.11-R2' and account_type in ('ARTIST','LABEL');
commit;

-- PDF privado só pode ser enviado depois de um aceite auditável, para a própria conta.
begin;
drop policy if exists contracts_storage_insert_own on storage.objects;
create policy contracts_storage_insert_own on storage.objects
for insert to authenticated with check (
  bucket_id='contracts'
  and name=(select auth.uid())::text||'/contrato_assinado.pdf'
  and exists (
    select 1 from public.user_contracts uc
    where uc.user_id=(select auth.uid())
      and uc.signed_at is not null
      and uc.pdf_status='pending'
  )
);
commit;
