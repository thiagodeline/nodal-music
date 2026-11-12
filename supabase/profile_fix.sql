-- Rode no SQL Editor. Corrige "Não encontramos o seu perfil".
-- 1) cria o perfil de quem já tem conta mas ficou sem linha na tabela
insert into public.profiles (id, email)
select u.id, u.email from auth.users u left join public.profiles p on p.id = u.id where p.id is null
on conflict do nothing;

-- 2) garante que toda conta nova ganha o perfil (status PENDING_ONBOARDING) no momento do cadastro
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, terms_version, terms_accepted_at)
  values (new.id, new.email, new.raw_user_meta_data->>'terms_version', case when new.raw_user_meta_data->>'terms_version' is not null then now() end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 3) permite que o próprio usuário crie a SUA linha (autocura), sem poder se promover
drop policy if exists p_ins on public.profiles;
create policy p_ins on public.profiles for insert
  with check (id = auth.uid() and role = 'artist' and can_release_music = false and status in ('PENDING_ONBOARDING','PENDING_CONTRACT'));

-- diagnóstico: deve retornar 0
-- select count(*) from auth.users u left join public.profiles p on p.id = u.id where p.id is null;
