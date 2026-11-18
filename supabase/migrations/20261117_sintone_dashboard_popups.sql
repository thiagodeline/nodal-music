begin;
create table if not exists public.dashboard_popups(
 id uuid primary key default gen_random_uuid(),
 image_url text not null check(length(image_url) <= 1024),
 is_active boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists dashboard_popups_active_created_idx on public.dashboard_popups(is_active,created_at desc);
alter table public.dashboard_popups enable row level security;
drop policy if exists "dashboard_popups_artist_read_active" on public.dashboard_popups;
create policy "dashboard_popups_artist_read_active" on public.dashboard_popups for select to authenticated using (is_active or public.is_admin());
drop policy if exists "dashboard_popups_admin_insert" on public.dashboard_popups;
create policy "dashboard_popups_admin_insert" on public.dashboard_popups for insert to authenticated with check (public.is_admin());
drop policy if exists "dashboard_popups_admin_update" on public.dashboard_popups;
create policy "dashboard_popups_admin_update" on public.dashboard_popups for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "dashboard_popups_admin_delete" on public.dashboard_popups;
create policy "dashboard_popups_admin_delete" on public.dashboard_popups for delete to authenticated using (public.is_admin());
drop policy if exists "sintone_popups_admin_insert" on storage.objects;
create policy "sintone_popups_admin_insert" on storage.objects for insert to authenticated with check(bucket_id='public-assets' and name like 'popups/%' and public.is_admin());
drop policy if exists "sintone_popups_admin_delete" on storage.objects;
create policy "sintone_popups_admin_delete" on storage.objects for delete to authenticated using(bucket_id='public-assets' and name like 'popups/%' and public.is_admin());
commit;