-- SINTONE: configuração pública do Hero com edição restrita e uploads de imagens.
-- Migration aplicada ao projeto Supabase nodalmusic (jklitdqichsuymgspvbe).
begin;
create table if not exists public.landing_page_config (
 id integer primary key default 1 check (id=1),
 hero_image_url text,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
insert into public.landing_page_config(id,hero_image_url) values(1,null) on conflict(id) do nothing;
alter table public.landing_page_config enable row level security;
revoke all on public.landing_page_config from public,anon,authenticated;
grant select on public.landing_page_config to anon,authenticated;
grant insert,update on public.landing_page_config to authenticated;
drop policy if exists landing_config_public_read on public.landing_page_config;
create policy landing_config_public_read on public.landing_page_config for select to anon,authenticated using(true);
drop policy if exists landing_config_admin_insert on public.landing_page_config;
create policy landing_config_admin_insert on public.landing_page_config for insert to authenticated
with check(public.is_admin() and id=1);
drop policy if exists landing_config_admin_update on public.landing_page_config;
create policy landing_config_admin_update on public.landing_page_config for update to authenticated
using(public.is_admin() and id=1) with check(public.is_admin() and id=1);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('public-assets','public-assets',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists sintone_hero_admin_insert on storage.objects;
create policy sintone_hero_admin_insert on storage.objects for insert to authenticated
with check(bucket_id='public-assets' and name like 'hero/%' and public.is_admin());
drop policy if exists sintone_hero_admin_update on storage.objects;
create policy sintone_hero_admin_update on storage.objects for update to authenticated
using(bucket_id='public-assets' and name like 'hero/%' and public.is_admin())
with check(bucket_id='public-assets' and name like 'hero/%' and public.is_admin());
drop policy if exists sintone_hero_admin_delete on storage.objects;
create policy sintone_hero_admin_delete on storage.objects for delete to authenticated
using(bucket_id='public-assets' and name like 'hero/%' and public.is_admin());
commit;
