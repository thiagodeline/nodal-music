-- Rode no SQL Editor depois do schema.sql e do legal.sql
alter table releases add column if not exists isrc text, add column if not exists upc text, add column if not exists main_artist text, add column if not exists genre text, add column if not exists explicit boolean default false;
alter table releases drop constraint if exists releases_status_check;
alter table releases add constraint releases_status_check check(status in('draft','pending','approved','rejected','live'));
drop policy if exists r_ins on releases;
create policy r_ins on releases for insert with check(artist_id=auth.uid() and status in('draft','pending'));
alter table reports add column if not exists country text;
