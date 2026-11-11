-- Rode no SQL Editor depois do schema.sql
alter table profiles add column if not exists terms_version text, add column if not exists terms_accepted_at timestamptz;
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles(id,name,artist_name,terms_version,terms_accepted_at)
  values(new.id,new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'terms_version',
         case when new.raw_user_meta_data->>'terms_version' is not null then now() end);
  return new;
end $$;

create table if not exists lgpd_requests(
  id uuid primary key, name text not null check(char_length(name)<=120), email text not null check(char_length(email)<=160),
  type text not null, details text check(char_length(details)<=1500),
  status text not null default 'open' check(status in('open','done')), created_at timestamptz default now());
alter table lgpd_requests enable row level security;
create policy lgpd_ins on lgpd_requests for insert to anon, authenticated with check(status='open');
create policy lgpd_sel on lgpd_requests for select using(is_admin());
create policy lgpd_upd on lgpd_requests for update using(is_admin());
