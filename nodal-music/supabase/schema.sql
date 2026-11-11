-- Rode inteiro no SQL Editor do Supabase (projeto novo ou limpo)
create table profiles(id uuid primary key references auth.users on delete cascade, name text, artist_name text, pix_key text, role text not null default 'artist' check(role in('artist','admin')), contract_accepted_at timestamptz, created_at timestamptz default now());
create table releases(id uuid primary key default gen_random_uuid(), artist_id uuid not null references profiles on delete cascade, title text not null, type text not null default 'single', release_date date, cover_path text, audio_path text, status text not null default 'pending' check(status in('pending','approved','rejected','live')), created_at timestamptz default now());
create table reports(id uuid primary key default gen_random_uuid(), artist_id uuid not null references profiles on delete cascade, release_id uuid references releases on delete set null, platform text not null, month date not null, streams bigint not null default 0, revenue numeric(12,2) not null default 0);
create table withdrawals(id uuid primary key default gen_random_uuid(), artist_id uuid not null references profiles on delete cascade, amount numeric(12,2) not null check(amount>0), pix_key text not null, status text not null default 'pending' check(status in('pending','paid','rejected')), created_at timestamptz default now());

create function is_admin() returns boolean language sql security definer stable as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function handle_new_user() returns trigger language plpgsql security definer as $$ begin insert into profiles(id,name,artist_name) values(new.id,new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

alter table profiles enable row level security; alter table releases enable row level security; alter table reports enable row level security; alter table withdrawals enable row level security;
create policy p_sel on profiles for select using(id=auth.uid() or is_admin());
create policy p_upd on profiles for update using(id=auth.uid() or is_admin()) with check(role=(select role from profiles where id=auth.uid()) or is_admin());
create policy r_sel on releases for select using(artist_id=auth.uid() or is_admin());
create policy r_ins on releases for insert with check(artist_id=auth.uid() and status='pending');
create policy r_upd on releases for update using(is_admin());
create policy rp_sel on reports for select using(artist_id=auth.uid() or is_admin());
create policy rp_all on reports for all using(is_admin()) with check(is_admin());
create policy w_sel on withdrawals for select using(artist_id=auth.uid() or is_admin());
create policy w_ins on withdrawals for insert with check(artist_id=auth.uid() and status='pending');
create policy w_upd on withdrawals for update using(is_admin());

insert into storage.buckets(id,name,public) values('covers','covers',true),('audio','audio',false) on conflict do nothing;
create policy s_up on storage.objects for insert to authenticated with check(bucket_id in('covers','audio') and (storage.foldername(name))[1]=auth.uid()::text);
create policy s_cov on storage.objects for select using(bucket_id='covers');
create policy s_aud on storage.objects for select to authenticated using(bucket_id='audio' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));
-- Depois de criar sua conta no site, vire admin:
-- update profiles set role='admin' where id=(select id from auth.users where email='SEU@EMAIL');
