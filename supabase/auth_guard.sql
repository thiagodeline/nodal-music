-- Rode no SQL Editor depois do onboarding.sql
alter table profiles add column if not exists onboarding_completed boolean not null default false;
update profiles set onboarding_completed = true where status <> 'PENDING_ONBOARDING';
-- a flag nunca fica fora de sincronia com o status (o artista não consegue "pular" o onboarding)
alter table profiles drop constraint if exists profiles_onboarding_flag;
alter table profiles add constraint profiles_onboarding_flag check (onboarding_completed = (status <> 'PENDING_ONBOARDING'));
