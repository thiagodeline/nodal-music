begin;
create table if not exists public.artist_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 artist_profile_id uuid references public.artist_profiles(id) on delete set null,
 title text not null check(char_length(trim(title)) between 3 and 160),
 message text not null check(char_length(trim(message)) between 1 and 3000),
 type text not null default 'info' check(type in ('info','success','warning','action')),
 action_url text check(action_url is null or (char_length(action_url)<=255 and action_url ~ '^/dashboard(#(overview|catalog|drafts|new|profiles|analytics|split|financial|account|plans|support|notifications|contracts|privacy))?$')),
 read boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists artist_notifications_user_recent_idx on public.artist_notifications(user_id,created_at desc);
create index if not exists artist_notifications_user_unread_idx on public.artist_notifications(user_id,read,created_at desc);
alter table public.artist_notifications enable row level security;
drop policy if exists artist_notifications_own_select on public.artist_notifications;
create policy artist_notifications_own_select on public.artist_notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists artist_notifications_own_mark_read on public.artist_notifications;
create policy artist_notifications_own_mark_read on public.artist_notifications for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists artist_notifications_admin_all on public.artist_notifications;
create policy artist_notifications_admin_all on public.artist_notifications for all to authenticated
 using((select public.is_admin())) with check((select public.is_admin()));
grant select,insert,update,delete on public.artist_notifications to authenticated;
create or replace function public.mark_artist_direct_notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed boolean;
begin
 update public.artist_notifications set read=true where id=p_id and user_id=auth.uid() and read=false returning true into changed;
 return coalesce(changed,false);
end $$;
revoke all on function public.mark_artist_direct_notification_read(uuid) from public,anon;
grant execute on function public.mark_artist_direct_notification_read(uuid) to authenticated;
create or replace function public.artist_notification_validate_recipient()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.artist_profile_id is not null and not exists(select 1 from public.artist_profiles where id=new.artist_profile_id and owner_id=new.user_id) then
  raise exception 'artist_profile_id não pertence ao destinatário';
 end if;
 if tg_op='UPDATE' and not public.is_admin() then
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
   or new.artist_profile_id is distinct from old.artist_profile_id
   or new.title is distinct from old.title or new.message is distinct from old.message
   or new.type is distinct from old.type or new.action_url is distinct from old.action_url
   or new.created_at is distinct from old.created_at or new.read=false then
   raise exception 'Apenas marcar como lida é permitido';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists artist_notifications_guard on public.artist_notifications;
create trigger artist_notifications_guard before insert or update on public.artist_notifications
for each row execute function public.artist_notification_validate_recipient();
commit;