-- Rode no SQL Editor depois do dashboard2.sql
do $$ begin create type account_type as enum ('ARTIST','LABEL'); exception when duplicate_object then null; end $$;
do $$ begin create type account_status as enum ('PENDING_ONBOARDING','PENDING_CONTRACT','ACTIVE','BLOCKED'); exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists email text, add column if not exists phone text, add column if not exists birth_date date, add column if not exists address text,
  add column if not exists account_type account_type, add column if not exists status account_status not null default 'PENDING_ONBOARDING',
  add column if not exists can_release_music boolean not null default false, add column if not exists cpf text, add column if not exists cnpj text;
-- stage_name = coluna artist_name (nome artístico ou razão social do selo); fullName = coluna name

update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
update profiles set status = 'ACTIVE', can_release_music = true where role = 'admin';

create unique index if not exists profiles_cpf_key on profiles(cpf) where cpf is not null;
create unique index if not exists profiles_cnpj_key on profiles(cnpj) where cnpj is not null;
alter table profiles drop constraint if exists profiles_cpf_fmt;  alter table profiles add constraint profiles_cpf_fmt check (cpf is null or cpf ~ '^\d{11}$');
alter table profiles drop constraint if exists profiles_cnpj_fmt; alter table profiles add constraint profiles_cnpj_fmt check (cnpj is null or cnpj ~ '^[A-Z0-9]{12}\d{2}$');
alter table profiles drop constraint if exists profiles_release_needs_active; alter table profiles add constraint profiles_release_needs_active check (not can_release_music or status = 'ACTIVE');
alter table profiles drop constraint if exists profiles_onboarding_complete;
alter table profiles add constraint profiles_onboarding_complete check (status <> 'PENDING_CONTRACT' or (
  account_type is not null and name is not null and birth_date is not null and phone is not null and address is not null and artist_name is not null and email is not null
  and ((account_type = 'ARTIST' and cpf is not null) or (account_type = 'LABEL' and cnpj is not null))));

-- novo cadastro: só e-mail e senha (o perfil nasce vazio e pendente de onboarding)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, terms_version, terms_accepted_at)
  values (new.id, new.email, new.raw_user_meta_data->>'terms_version', case when new.raw_user_meta_data->>'terms_version' is not null then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

-- o artista nunca pode se liberar sozinho: só admin muda status, permissão e papel
create or replace function public.guard_profile_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;  -- SQL Editor/service role ou admin
  if new.role is distinct from old.role or new.can_release_music is distinct from old.can_release_music then raise exception 'Alteração não permitida.'; end if;
  if new.status is distinct from old.status and not (old.status = 'PENDING_ONBOARDING' and new.status = 'PENDING_CONTRACT') then raise exception 'Alteração de status não permitida.'; end if;
  if old.status <> 'PENDING_ONBOARDING' and (new.account_type is distinct from old.account_type or new.cpf is distinct from old.cpf or new.cnpj is distinct from old.cnpj or new.name is distinct from old.name or new.birth_date is distinct from old.birth_date) then
    raise exception 'Dados cadastrais só podem ser alterados pela equipe. Abra um chamado.'; end if;
  return new;
end $$;
drop trigger if exists guard_profile_update on profiles;
create trigger guard_profile_update before update on profiles for each row execute function guard_profile_update();

-- a trava vale no banco, não só na tela: sem contrato aprovado não há envio de lançamento nem de arquivos
create or replace function public.can_release() returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select can_release_music and status = 'ACTIVE' from profiles where id = auth.uid()), false) $$;
drop policy if exists r_ins on releases;
create policy r_ins on releases for insert with check (artist_id = auth.uid() and status in ('draft','pending') and can_release());
drop policy if exists s_up on storage.objects;
create policy s_up on storage.objects for insert to authenticated with check (bucket_id in ('covers','audio') and (storage.foldername(name))[1] = auth.uid()::text and can_release());
