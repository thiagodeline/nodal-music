begin;
alter table public.landing_page_config add column if not exists feature_video_url text;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('landing-videos','landing-videos',true,52428800,array['video/mp4','video/webm']::text[])
on conflict (id) do update set public=true,file_size_limit=52428800,allowed_mime_types=array['video/mp4','video/webm']::text[];
drop policy if exists sintone_landing_video_admin_insert on storage.objects;
create policy sintone_landing_video_admin_insert on storage.objects for insert to authenticated
 with check (bucket_id='landing-videos' and name like 'landing/%' and public.is_admin());
drop policy if exists sintone_landing_video_admin_delete on storage.objects;
create policy sintone_landing_video_admin_delete on storage.objects for delete to authenticated
 using (bucket_id='landing-videos' and name like 'landing/%' and public.is_admin());
commit;