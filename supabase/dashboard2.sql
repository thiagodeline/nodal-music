-- Rode no SQL Editor depois do dashboard.sql
alter table releases add column if not exists credits text;
alter table withdrawals add column if not exists receipt_path text;

create table if not exists artist_profiles(id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles on delete cascade, name text not null check(char_length(name)<=120), spotify_artist_id text, apple_artist_id text, created_at timestamptz default now());
create table if not exists tickets(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, subject text not null check(char_length(subject)<=140), category text not null check(category in('lancamentos','financeiro','outros')), message text not null check(char_length(message)<=3000), status text not null default 'open' check(status in('open','in_progress','closed')), created_at timestamptz default now());
create table if not exists splits(id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles on delete cascade, release_id uuid not null references releases on delete cascade, email text not null, role text not null default 'Outro', percent numeric(5,2) not null check(percent>0 and percent<=100), created_at timestamptz default now());

alter table artist_profiles enable row level security; alter table tickets enable row level security; alter table splits enable row level security;
create policy ap_all on artist_profiles for all using(owner_id=auth.uid() or is_admin()) with check(owner_id=auth.uid());
create policy tk_sel on tickets for select using(user_id=auth.uid() or is_admin());
create policy tk_ins on tickets for insert with check(user_id=auth.uid() and status='open');
create policy tk_upd on tickets for update using(is_admin());
create policy sp_all on splits for all using(owner_id=auth.uid() or is_admin()) with check(owner_id=auth.uid());

insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict do nothing;
create policy rc_ins on storage.objects for insert to authenticated with check(bucket_id='receipts' and is_admin());
create policy rc_sel on storage.objects for select to authenticated using(bucket_id='receipts' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));
