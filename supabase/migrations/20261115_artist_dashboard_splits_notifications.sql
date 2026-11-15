-- SINTONE: dashboard do artista, notificações, convites e rascunhos.
-- Este estado já foi aplicado no projeto Supabase de produção; arquivo para versionamento.
begin;
create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 180),
 message text not null check(length(message) between 1 and 3000),
 type text not null check(type in ('release_approved','release_rejected','split_invite','system')),
 read boolean not null default false,link_url text,created_at timestamptz not null default now()
);
create index if not exists notifications_user_feed on public.notifications(user_id,created_at desc);
create index if not exists notifications_unread on public.notifications(user_id) where read=false;
alter table public.notifications enable row level security;
drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
revoke insert,update,delete on public.notifications from authenticated,anon;
grant select on public.notifications to authenticated;

create table if not exists public.royalty_splits(
 id uuid primary key default gen_random_uuid(),
 release_id uuid not null references public.releases(id) on delete cascade,
 track_id uuid references public.release_tracks(id) on delete cascade,
 creator_user_id uuid not null references auth.users(id) on delete cascade,
 collaborator_email text not null,
 collaborator_user_id uuid references auth.users(id) on delete set null,
 percentage numeric(5,2) not null check(percentage>0 and percentage<=100),
 status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now()
);
create unique index if not exists royalty_splits_unique_email on public.royalty_splits
 (release_id,coalesce(track_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(collaborator_email))
 where status in ('pending','accepted');
create index if not exists royalty_splits_creator on public.royalty_splits(creator_user_id,created_at desc);
create index if not exists royalty_splits_collaborator on public.royalty_splits(collaborator_user_id,status);
alter table public.royalty_splits enable row level security;
drop policy if exists royalty_splits_participants_read on public.royalty_splits;
create policy royalty_splits_participants_read on public.royalty_splits for select to authenticated
 using(creator_user_id=(select auth.uid()) or collaborator_user_id=(select auth.uid()) or public.is_admin());
revoke insert,update,delete on public.royalty_splits from authenticated,anon;
grant select on public.royalty_splits to authenticated;

create table if not exists public.royalty_split_audit(
 id uuid primary key default gen_random_uuid(),
 split_id uuid not null references public.royalty_splits(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 from_status text not null,to_status text not null,reason text not null default '',
 created_at timestamptz not null default now()
);
alter table public.royalty_split_audit enable row level security;
drop policy if exists royalty_split_audit_admin on public.royalty_split_audit;
create policy royalty_split_audit_admin on public.royalty_split_audit for select to authenticated using(public.is_admin());

create table if not exists public.release_drafts(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Sem título',data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists release_drafts_owner on public.release_drafts(user_id,updated_at desc);
alter table public.release_drafts enable row level security;
drop policy if exists release_drafts_owner_access on public.release_drafts;
create policy release_drafts_owner_access on public.release_drafts for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table if not exists public.dashboard_banners(
 id uuid primary key default gen_random_uuid(),
 headline text not null check(length(headline) between 3 and 120),
 body text not null default '',cta_label text not null default 'Conhecer planos',
 cta_url text not null default '/dashboard#plans',
 active boolean not null default false,created_at timestamptz not null default now()
);
alter table public.dashboard_banners enable row level security;
drop policy if exists dashboard_banner_public on public.dashboard_banners;
create policy dashboard_banner_public on public.dashboard_banners for select to authenticated
 using(active=true or public.is_admin());
drop policy if exists dashboard_banner_admin_write on public.dashboard_banners;
create policy dashboard_banner_admin_write on public.dashboard_banners for all to authenticated
 using(public.is_admin()) with check(public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_cancel_royalty_split(p_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.royalty_splits%rowtype;
begin
 if not public.is_admin() then raise exception 'Acesso restrito';end if;
 if length(trim(p_reason)) not between 10 and 500 then raise exception 'Justificativa de 10 a 500 caracteres obrigatória';end if;
 select * into v from public.royalty_splits where id=p_id for update;
 if not found or v.status='rejected' then raise exception 'Divisão indisponível';end if;
 update public.royalty_splits set status='rejected' where id=p_id;
 insert into public.royalty_split_audit(split_id,actor_id,from_status,to_status,reason)
 values(p_id,auth.uid(),v.status,'rejected',trim(p_reason));
 insert into public.notifications(user_id,title,message,type,link_url)
 values(v.creator_user_id,'Divisão de royalties cancelada','A equipe cancelou uma divisão de royalties. Consulte o suporte para detalhes.','system','/dashboard#split');
 if v.collaborator_user_id is not null then
  insert into public.notifications(user_id,title,message,type,link_url)
  values(v.collaborator_user_id,'Divisão de royalties cancelada','A equipe cancelou uma divisão de royalties.','system','/dashboard#notifications');
 end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.answer_royalty_split_invite(p_id uuid, p_accept boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.royalty_splits%rowtype;
begin
 if auth.uid() is null then raise exception 'Login obrigatório';end if;
 select * into v from public.royalty_splits where id=p_id for update;
 if not found or v.collaborator_user_id is distinct from auth.uid() or v.status<>'pending' then
  raise exception 'Convite não disponível';end if;
 update public.royalty_splits set status=case when p_accept then 'accepted' else 'rejected' end where id=p_id;
 insert into public.royalty_split_audit(split_id,actor_id,from_status,to_status)
 values(p_id,auth.uid(),'pending',case when p_accept then 'accepted' else 'rejected' end);
 insert into public.notifications(user_id,title,message,type,link_url)
 values(v.creator_user_id,'Resposta ao convite de royalties',
  case when p_accept then 'O colaborador aceitou a divisão de royalties.' else 'O colaborador rejeitou a divisão de royalties.' end,
  'system','/dashboard#split');
 return case when p_accept then 'accepted' else 'rejected' end;
end $function$
;

CREATE OR REPLACE FUNCTION public.create_royalty_split_invite(p_release_id uuid, p_track_id uuid, p_email text, p_percentage numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_target uuid; v_id uuid; v_email text:=lower(trim(p_email)); v_total numeric;
begin
 if v_uid is null then raise exception 'Login obrigatório'; end if;
 if length(v_email) not between 5 and 254 or v_email not like '%_@_%._%'
 or p_percentage is null or p_percentage<=0 or p_percentage>100
 or round(p_percentage,2)<>p_percentage then raise exception 'Convite inválido';end if;
 perform 1 from public.releases where id=p_release_id and artist_id=v_uid for update;
 if not found then raise exception 'Lançamento não pertence à sua conta';end if;
 if p_track_id is not null and not exists(select 1 from public.release_tracks where id=p_track_id and release_id=p_release_id)
 then raise exception 'Faixa inválida';end if;
 if lower((select email from auth.users where id=v_uid))=v_email then raise exception 'Não convide a própria conta';end if;
 select coalesce(sum(percentage),0) into v_total from public.royalty_splits
 where release_id=p_release_id and track_id is not distinct from p_track_id and status in ('pending','accepted');
 if v_total+p_percentage>100 then raise exception 'A soma das divisões ultrapassa 100%%';end if;
 select id into v_target from auth.users where lower(email)=v_email and deleted_at is null limit 1;
 insert into public.royalty_splits(release_id,track_id,creator_user_id,collaborator_email,collaborator_user_id,percentage)
 values(p_release_id,p_track_id,v_uid,v_email,v_target,p_percentage) returning id into v_id;
 if v_target is not null then
  insert into public.notifications(user_id,title,message,type,link_url)
  values(v_target,'Convite de divisão de royalties','Você recebeu um convite de divisão de royalties. Verifique o percentual antes de aceitar.','split_invite','/dashboard#notifications');
 end if;
 return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.mark_sintone_notification_read(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Login obrigatório';end if;
 update public.notifications set read=true where id=p_id and user_id=auth.uid();
end $function$
;

CREATE OR REPLACE FUNCTION public.notify_sintone_release_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status is distinct from old.status and new.status in ('approved','rejected') then
  insert into public.notifications(user_id,title,message,type,link_url)
  values(new.artist_id,
   case when new.status='approved' then 'Lançamento aprovado' else 'Lançamento rejeitado' end,
   case when new.status='approved' then 'Seu lançamento "'||left(new.title,120)||'" foi aprovado para a próxima etapa de distribuição.'
    else 'Seu lançamento "'||left(new.title,120)||'" precisa de ajustes. '||left(coalesce(new.rejection_reason,''),600) end,
   case when new.status='approved' then 'release_approved' else 'release_rejected' end,
   '/dashboard#catalog');
 end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.sintone_sync_auth_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.royalty_splits%rowtype;
begin
 if tg_op='UPDATE' and new.email is not distinct from old.email then return new; end if;
 update public.profiles set email=new.email where id=new.id;
 for v in select * from public.royalty_splits s where s.status='pending'
   and s.collaborator_user_id is null and lower(s.collaborator_email)=lower(new.email)
   for update
 loop
  update public.royalty_splits set collaborator_user_id=new.id where id=v.id;
  insert into public.notifications(user_id,title,message,type,link_url)
  values(new.id,'Convite de divisão de royalties',
   'Você recebeu um convite de royalties. Confira o percentual antes de aceitar.',
   'split_invite','/dashboard#notifications');
 end loop;
 return new;
end $function$
;

drop trigger if exists sintone_release_notify_status on public.releases;
create trigger sintone_release_notify_status after update of status on public.releases
 for each row execute function public.notify_sintone_release_status();
drop trigger if exists sintone_sync_auth_email_insert on auth.users;
create trigger sintone_sync_auth_email_insert after insert on auth.users
 for each row execute function public.sintone_sync_auth_email();
drop trigger if exists sintone_sync_auth_email_update on auth.users;
create trigger sintone_sync_auth_email_update after update of email on auth.users
 for each row execute function public.sintone_sync_auth_email();

revoke all on function public.create_royalty_split_invite(uuid,uuid,text,numeric) from public,anon;
grant execute on function public.create_royalty_split_invite(uuid,uuid,text,numeric) to authenticated;
revoke all on function public.answer_royalty_split_invite(uuid,boolean) from public,anon;
grant execute on function public.answer_royalty_split_invite(uuid,boolean) to authenticated;
revoke all on function public.admin_cancel_royalty_split(uuid,text) from public,anon;
grant execute on function public.admin_cancel_royalty_split(uuid,text) to authenticated;
revoke all on function public.mark_sintone_notification_read(uuid) from public,anon;
grant execute on function public.mark_sintone_notification_read(uuid) to authenticated;
commit;
