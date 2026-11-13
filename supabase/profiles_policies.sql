-- Rode no SQL Editor. Corrige o onboarding que falha ao criar/salvar o perfil.

-- 0) se você aplicou a política "FOR ALL" sugerida antes, remova: ela deixa o usuário se promover a admin
drop policy if exists "Permitir utilizador atualizar o próprio perfil" on public.profiles;

-- 1) colunas e flag usadas pelo onboarding (não faz nada se já existirem)
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
update public.profiles set onboarding_completed = true where status <> 'PENDING_ONBOARDING';
alter table public.profiles drop constraint if exists profiles_onboarding_flag;
alter table public.profiles add constraint profiles_onboarding_flag check (onboarding_completed = (status <> 'PENDING_ONBOARDING'));

-- 2) políticas seguras: ler e atualizar a própria linha já existem (p_sel e p_upd); falta criar a própria linha
alter table public.profiles enable row level security;
drop policy if exists p_ins on public.profiles;
create policy p_ins on public.profiles for insert
  with check (id = auth.uid() and role = 'artist' and can_release_music = false and status in ('PENDING_ONBOARDING','PENDING_CONTRACT'));

-- diagnóstico 1: políticas da tabela (devem aparecer p_sel, p_ins e p_upd, e nenhuma com "ALL")
-- select policyname, cmd from pg_policies where tablename = 'profiles';
-- diagnóstico 2: colunas (devem existir account_type, address, artist_name, birth_date, can_release_music, cnpj, cpf, email, name, onboarding_completed, phone, status)
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles' order by 1;
