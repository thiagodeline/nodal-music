-- SINTONE: Spotify profiles and release participant metadata.
begin;
alter table public.artist_profiles
 add column if not exists spotify_id text,
 add column if not exists spotify_url text,
 add column if not exists is_first_spotify_release boolean not null default false;
update public.artist_profiles
 set spotify_id=spotify_artist_id,
     spotify_url='https://open.spotify.com/artist/'||spotify_artist_id
 where spotify_artist_id ~ '^[A-Za-z0-9]{22}$'
   and spotify_id is null
   and coalesce(is_first_spotify_release,false)=false;
create table if not exists public.release_artists(
 id uuid primary key default gen_random_uuid(),
 release_id uuid not null references public.releases(id) on delete cascade,
 profile_id uuid references public.artist_profiles(id) on delete set null,
 name text not null,
 role text not null check(role in ('primary','featured','remixer')),
 spotify_url text,
 spotify_id text,
 is_first_spotify_release boolean not null default false,
 created_at timestamptz not null default now(),
 unique(release_id,profile_id,role)
);
alter table public.release_artists
 add column if not exists spotify_url text,
 add column if not exists spotify_id text,
 add column if not exists is_first_spotify_release boolean not null default false;
create index if not exists release_artists_release_idx on public.release_artists(release_id);
create index if not exists release_artists_profile_idx on public.release_artists(profile_id);
alter table public.release_artists enable row level security;
drop policy if exists release_artists_owner_staff_read on public.release_artists;
create policy release_artists_owner_staff_read on public.release_artists for select to authenticated
 using(exists(select 1 from public.releases r where r.id=release_id and r.artist_id=auth.uid())
 or public.is_admin() or public.has_admin_role('qc_specialist') or public.has_admin_role('a_and_r') or public.has_admin_role('ingestion_manager'));
grant select on public.release_artists to authenticated;
revoke insert,update,delete on public.release_artists from anon,authenticated;
drop policy if exists spotify_artist_profiles_staff_read on public.artist_profiles;
create policy spotify_artist_profiles_staff_read on public.artist_profiles for select to authenticated
 using(public.is_admin() or public.has_admin_role('qc_specialist') or public.has_admin_role('a_and_r') or public.has_admin_role('ingestion_manager'));
create or replace function public.sintone_spotify_profile_normalize()
 returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id text;
begin
 if new.is_first_spotify_release then
   new.spotify_id:=null;new.spotify_url:=null;new.spotify_artist_id:=null;
 else
   v_id:=coalesce(nullif(btrim(new.spotify_id),''),nullif(btrim(new.spotify_artist_id),''));
   if v_id is null and nullif(btrim(new.spotify_url),'') is not null then
    v_id:=substring(new.spotify_url from '^https://open[.]spotify[.]com/artist/([A-Za-z0-9]{22})(?:[/?#].*)?$');
   end if;
   if v_id is not null and v_id !~ '^[A-Za-z0-9]{22}$' then raise exception 'Spotify ID inválido.';end if;
   if new.spotify_url is not null and btrim(new.spotify_url)<>'' and
      new.spotify_url !~ '^https://open[.]spotify[.]com/artist/[A-Za-z0-9]{22}([/?#].*)?$' then
      raise exception 'URL de Spotify inválida.';
   end if;
   new.spotify_id:=v_id;new.spotify_artist_id:=v_id;
   new.spotify_url:=case when v_id is not null then 'https://open.spotify.com/artist/'||v_id else null end;
 end if;
 return new;
end;$$;
drop trigger if exists artist_profiles_spotify_normalize on public.artist_profiles;
create trigger artist_profiles_spotify_normalize before insert or update of spotify_id,spotify_url,spotify_artist_id,is_first_spotify_release on public.artist_profiles
 for each row execute function public.sintone_spotify_profile_normalize();
create or replace function public.sintone_populate_release_artists()
 returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.release_artists(release_id,profile_id,name,role,spotify_id,spotify_url,is_first_spotify_release)
 select new.id,ap.id,x.item->>'name',x.item->>'role',ap.spotify_id,ap.spotify_url,ap.is_first_spotify_release
 from jsonb_array_elements(coalesce(new.artists,'[]'::jsonb)) as x(item)
 join public.artist_profiles ap on ap.id=(x.item->>'profile_id')::uuid
 where (x.item->>'role') in ('primary','featured','remixer')
 on conflict (release_id,profile_id,role) do update
 set spotify_id=excluded.spotify_id,spotify_url=excluded.spotify_url,is_first_spotify_release=excluded.is_first_spotify_release;
 return new;
end;$$;
drop trigger if exists sintone_capture_release_artists on public.releases;
create trigger sintone_capture_release_artists after insert on public.releases
 for each row execute function public.sintone_populate_release_artists();
insert into public.release_artists(release_id,profile_id,name,role,spotify_id,spotify_url,is_first_spotify_release)
 select r.id,ap.id,x.item->>'name',x.item->>'role',ap.spotify_id,ap.spotify_url,ap.is_first_spotify_release
 from public.releases r cross join lateral jsonb_array_elements(coalesce(r.artists,'[]'::jsonb)) x(item)
 join public.artist_profiles ap on ap.id=(x.item->>'profile_id')::uuid
 where (x.item->>'role') in ('primary','featured','remixer')
 on conflict (release_id,profile_id,role) do nothing;
create or replace function public.sintone_sync_release_artist_spotify()
 returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.release_artists set spotify_id=new.spotify_id,spotify_url=new.spotify_url,
 is_first_spotify_release=new.is_first_spotify_release where profile_id=new.id;
 return new;
end;$$;
drop trigger if exists artist_profiles_spotify_propagate on public.artist_profiles;
create trigger artist_profiles_spotify_propagate after update of spotify_id,spotify_url,is_first_spotify_release on public.artist_profiles
 for each row when(old.spotify_id is distinct from new.spotify_id or old.spotify_url is distinct from new.spotify_url or old.is_first_spotify_release is distinct from new.is_first_spotify_release)
 execute function public.sintone_sync_release_artist_spotify();
create or replace function public.sintone_admin_set_spotify_profile(p_profile uuid,p_spotify_id text,p_first boolean)
 returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not(public.is_admin() or public.has_admin_role('a_and_r')) then raise exception 'Sem permissão';end if;
 if p_profile is null or p_first is null then raise exception 'Dados inválidos';end if;
 if not p_first and nullif(btrim(p_spotify_id),'') is not null and btrim(p_spotify_id) !~ '^[A-Za-z0-9]{22}$' then raise exception 'ID do Spotify inválido';end if;
 update public.artist_profiles set spotify_artist_id=case when p_first then null else nullif(btrim(p_spotify_id),'') end, spotify_id=case when p_first then null else nullif(btrim(p_spotify_id),'') end,
 spotify_url=case when p_first or nullif(btrim(p_spotify_id),'') is null then null else 'https://open.spotify.com/artist/'||btrim(p_spotify_id) end,
 is_first_spotify_release=p_first where id=p_profile;
 if not found then raise exception 'Perfil não localizado';end if;
end;$$;
revoke all on function public.sintone_admin_set_spotify_profile(uuid,text,boolean) from public,anon;
grant execute on function public.sintone_admin_set_spotify_profile(uuid,text,boolean) to authenticated;
commit;