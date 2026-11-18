begin;
alter table public.artist_notifications add column if not exists deleted_at timestamptz;
alter table public.notifications add column if not exists deleted_at timestamptz;
create index if not exists artist_notifications_visible_user_idx on public.artist_notifications(user_id,created_at desc) where deleted_at is null;
create index if not exists notifications_visible_user_idx on public.notifications(user_id,created_at desc) where deleted_at is null;

-- SECURITY DEFINER RPCs validate auth.uid() and do not accept a user_id argument.
create or replace function public.delete_sintone_notification(p_id uuid,p_source text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid()); v_count integer := 0;
begin
 if v_user is null then raise exception 'Não autenticado' using errcode='28000'; end if;
 if p_id is null or p_source is null or p_source not in ('direct','legacy') then
  raise exception 'Dados inválidos' using errcode='22023'; end if;
 perform set_config('app.sintone_notification_delete','on',true);
 if p_source='direct' then
  update public.artist_notifications set deleted_at=now()
   where id=p_id and user_id=v_user and deleted_at is null;
 else
  update public.notifications set deleted_at=now()
   where id=p_id and user_id=v_user and deleted_at is null;
 end if;
 get diagnostics v_count=row_count;
 perform set_config('app.sintone_notification_delete','off',true);
 return v_count>0;
end $$;

create or replace function public.clear_sintone_notifications(p_mode text default 'all')
returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid()); d integer := 0; l integer := 0;
begin
 if v_user is null then raise exception 'Não autenticado' using errcode='28000'; end if;
 if p_mode is null or p_mode not in ('all','read') then raise exception 'Modo inválido' using errcode='22023'; end if;
 perform set_config('app.sintone_notification_delete','on',true);
 update public.artist_notifications set deleted_at=now()
  where user_id=v_user and deleted_at is null and (p_mode='all' or read=true);
 get diagnostics d=row_count;
 update public.notifications set deleted_at=now()
  where user_id=v_user and deleted_at is null and (p_mode='all' or read=true);
 get diagnostics l=row_count;
 perform set_config('app.sintone_notification_delete','off',true);
 return d+l;
end $$;

revoke all on function public.delete_sintone_notification(uuid,text) from public,anon;
grant execute on function public.delete_sintone_notification(uuid,text) to authenticated;
revoke all on function public.clear_sintone_notifications(text) from public,anon;
grant execute on function public.clear_sintone_notifications(text) to authenticated;

-- Existing recipient-validation trigger must allow soft-delete only during these trusted RPC calls.
create or replace function public.artist_notification_validate_recipient()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.artist_profile_id is not null and not exists (
  select 1 from public.artist_profiles where id=new.artist_profile_id and owner_id=new.user_id
 ) then raise exception 'artist_profile_id não pertence ao destinatário'; end if;
 if tg_op='UPDATE' and not public.is_admin() then
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
   or new.artist_profile_id is distinct from old.artist_profile_id
   or new.title is distinct from old.title or new.message is distinct from old.message
   or new.type is distinct from old.type or new.action_url is distinct from old.action_url
   or new.created_at is distinct from old.created_at
   or (new.read is distinct from old.read and new.read=false)
   or (new.deleted_at is distinct from old.deleted_at and
       coalesce(current_setting('app.sintone_notification_delete',true),'')<>'on') then
    raise exception 'Apenas marcar como lida é permitido';
  end if;
 end if;
 return new;
end $$;
commit;