-- =====================================================================
-- Nodal Music | Assinatura digital de contrato
-- Execute no Supabase: SQL Editor > New query
-- =====================================================================

-- 1) Helper: o usuário é admin?
-- Lê o papel em app_metadata (só o servidor altera; o usuário NÃO consegue
-- editar esse campo, ao contrário de user_metadata).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- Para promover um usuário a admin (rode uma vez, trocando o e-mail):
-- update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--  where email = 'admin@nodalmusic.com.br';
-- (o usuário precisa fazer login de novo para o JWT refletir o papel)

-- 2) Tabela de contratos assinados
create table if not exists public.user_contracts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  signed_name text not null check (char_length(trim(signed_name)) >= 5),
  signed_at   timestamptz not null default now(),
  ip_address  text,
  pdf_url     text not null,          -- caminho no bucket: <user_id>/contrato_assinado.pdf
  constraint user_contracts_one_per_user unique (user_id)
);

create index if not exists user_contracts_user_id_idx on public.user_contracts (user_id);

-- 3) RLS da tabela
alter table public.user_contracts enable row level security;

drop policy if exists "contracts_select_own"  on public.user_contracts;
drop policy if exists "contracts_insert_own"  on public.user_contracts;
drop policy if exists "contracts_admin_all"   on public.user_contracts;

-- Usuário lê somente o próprio contrato
create policy "contracts_select_own"
  on public.user_contracts for select
  to authenticated
  using (user_id = auth.uid());

-- Usuário registra somente o próprio contrato.
-- Sem policy de UPDATE/DELETE para o usuário: contrato assinado é imutável para ele.
create policy "contracts_insert_own"
  on public.user_contracts for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admin: acesso total
create policy "contracts_admin_all"
  on public.user_contracts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4) Bucket PRIVADO "contracts" (PDF até 10 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf'];

-- 5) Policies de Storage (pasta = user_id)
drop policy if exists "contracts_storage_insert_own" on storage.objects;
drop policy if exists "contracts_storage_select_own" on storage.objects;
drop policy if exists "contracts_storage_admin_all"  on storage.objects;

create policy "contracts_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contracts_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contracts_storage_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'contracts' and public.is_admin())
  with check (bucket_id = 'contracts' and public.is_admin());
