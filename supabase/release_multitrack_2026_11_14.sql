-- SINTONE: release multi-track metadata. Safe for legacy single records.
begin;

alter table public.releases
  add column if not exists artists jsonb not null default '[]'::jsonb,
  add column if not exists label_name text,
  add column if not exists p_line text,
  add column if not exists c_line text,
  add column if not exists platforms text[] not null default '{}'::text[];

create table if not exists public.release_tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  audio_path text not null,
  isrc text,
  featured_artists text,
  composers text not null check (char_length(btrim(composers)) between 2 and 700),
  producers text,
  lyricists text,
  credits text,
  contributors jsonb not null default '[]'::jsonb,
  explicit boolean not null default false,
  language text not null default 'pt',
  created_at timestamptz not null default now(),
  unique (release_id, position),
  check (isrc is null or isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  check (language = 'instrumental' or language ~ '^[a-z]{2}$')
);
create index if not exists release_tracks_release_idx on public.release_tracks(release_id,position);
alter table public.release_tracks enable row level security;
revoke all on public.release_tracks from public, anon, authenticated;
grant select on public.release_tracks to authenticated;
drop policy if exists release_tracks_read on public.release_tracks;
create policy release_tracks_read on public.release_tracks
  for select to authenticated
  using (exists (
    select 1 from public.releases r
    where r.id=release_id and (r.artist_id=(select auth.uid()) or (select public.is_admin()))
  ));

-- Remove older direct insertion path: submitting a release + its tracks is atomic via RPC.
drop policy if exists r_ins on public.releases;

create or replace function public.submit_sintone_release(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
  owner_row public.profiles%rowtype;
  kind text;
  track_count integer;
  artist_count integer;
  chosen_artists jsonb;
  tr jsonb;
  artist_item jsonb;
  pos integer;
  audio_path text;
  first_audio text;
  first_isrc text;
  first_title text;
  first_composers text;
  first_producers text;
  first_lyricists text;
  first_credits text;
  first_explicit boolean;
  first_featuring text;
  upc_value text;
  cover_path text;
  requested_date date;
  platforms_value text[];
  main_name text;
  featured_names text;
  v_count integer;
  v_size bigint;
  v_mime text;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Sessão válida obrigatória.';
  end if;

  select * into owner_row from public.profiles where id=uid for update;
  if not found or owner_row.role<>'artist' or owner_row.status<>'ACTIVE'
    or not owner_row.can_release_music
    or not exists (select 1 from public.user_contracts c where c.user_id=uid and c.pdf_status='ready') then
    raise exception 'Finalize a assinatura e aguarde aprovação antes de enviar músicas.';
  end if;

  if jsonb_typeof(p)<>'object' or jsonb_typeof(p->'tracks')<>'array'
    or jsonb_typeof(p->'artists')<>'array' or jsonb_typeof(p->'platforms')<>'array' then
    raise exception 'Dados do lançamento inválidos.';
  end if;
  rid := (p->>'id')::uuid;
  kind := p->>'type';
  track_count := jsonb_array_length(p->'tracks');
  if (kind='single' and track_count<>1)
    or (kind='ep' and track_count not between 2 and 6)
    or (kind='album' and track_count not between 7 and 100)
    or (kind not in ('single','ep','album') or kind is null) then
    raise exception 'Single deve ter 1 faixa, EP 2 a 6 e álbum 7 a 100.';
  end if;
  if length(btrim(coalesce(p->>'title',''))) not between 1 and 160
    or length(btrim(coalesce(p->>'genre',''))) not between 2 and 120
    or length(btrim(coalesce(p->>'label_name',''))) not between 2 and 150
    or length(btrim(coalesce(p->>'p_line',''))) not between 7 and 220
    or length(btrim(coalesce(p->>'c_line',''))) not between 7 and 220 then
    raise exception 'Preencha título, gênero, selo e direitos ℗/©.';
  end if;
  requested_date := (p->>'release_date')::date;
  if requested_date<current_date or requested_date>current_date+interval '3 years' then
    raise exception 'A data deve estar entre hoje e os próximos 3 anos.';
  end if;
  upc_value := nullif(regexp_replace(coalesce(p->>'upc',''),'[^0-9]','','g'),'');
  if upc_value is not null and upc_value !~ '^[0-9]{12,13}$' then
    raise exception 'UPC/EAN inválido.';
  end if;
  chosen_artists := p->'artists';
  artist_count := jsonb_array_length(chosen_artists);
  if artist_count not between 1 and 20 then raise exception 'Informe de 1 a 20 artistas.'; end if;
  if (select count(*) from jsonb_array_elements(chosen_artists) a where a->>'role'='primary')<>1 then
    raise exception 'Informe exatamente um artista principal.';
  end if;
  for artist_item in select value from jsonb_array_elements(chosen_artists) loop
    if btrim(coalesce(artist_item->>'name',''))='' or length(artist_item->>'name')>120
      or coalesce(artist_item->>'role','') not in ('primary','featured','remixer') then
      raise exception 'Artista, nome ou função inválidos.';
    end if;
    if nullif(artist_item->>'profile_id','') is not null
      and not exists(select 1 from public.artist_profiles ap
        where ap.id=(artist_item->>'profile_id')::uuid and ap.owner_id=uid
          and btrim(ap.name)=btrim(artist_item->>'name')) then
      raise exception 'O perfil de artista escolhido não pertence à conta.';
    end if;
  end loop;
  select value->>'name' into main_name
    from jsonb_array_elements(chosen_artists) where value->>'role'='primary' limit 1;
  select nullif(string_agg(value->>'name',', '),'') into featured_names
    from jsonb_array_elements(chosen_artists) where value->>'role'='featured';

  select array_agg(distinct value) into platforms_value
    from jsonb_array_elements_text(p->'platforms');
  if coalesce(array_length(platforms_value,1),0) not between 1 and 12
    or exists(select 1 from unnest(platforms_value) x
      where x not in ('Spotify','Apple Music','Deezer','YouTube Music','Amazon Music',
        'Tidal','TikTok','Instagram/Facebook','SoundCloud')) then
    raise exception 'Selecione pelo menos uma plataforma válida.';
  end if;

  cover_path := uid::text||'/'||rid::text||'/cover.jpg';
  if p->>'cover_path'<>cover_path then raise exception 'Caminho de capa inválido.'; end if;
  select (metadata->>'size')::bigint, lower(coalesce(metadata->>'mimetype',''))
    into v_size,v_mime from storage.objects
    where bucket_id='covers' and name=cover_path;
  if not found or v_size is null or v_size<1000 or v_size>15728640
    or v_mime not in ('image/jpeg','image/jpg') then
    raise exception 'Capa JPG não encontrada ou maior que 15 MB.';
  end if;

  for pos in 1..track_count loop
    tr := p->'tracks'->(pos-1);
    if jsonb_typeof(tr)<>'object'
      or length(btrim(coalesce(tr->>'title',''))) not between 1 and 160
      or length(btrim(coalesce(tr->>'composers',''))) not between 2 and 700
      or length(coalesce(tr->>'credits',''))>2000
      or length(coalesce(tr->>'producers',''))>700
      or length(coalesce(tr->>'lyricists',''))>700 then
      raise exception 'Metadados incompletos na faixa %.',pos;
    end if;
    if coalesce(tr->>'language','') <> 'instrumental'
      and coalesce(tr->>'language','') !~ '^[a-z]{2}$' then
      raise exception 'Idioma inválido na faixa %.',pos;
    end if;
    if jsonb_typeof(tr->'contributors')<>'array' or jsonb_array_length(tr->'contributors')>30
      or exists(select 1 from jsonb_array_elements(tr->'contributors') c
        where btrim(coalesce(c->>'name',''))='' or length(c->>'name')>120
          or c->>'role' not in ('featured','producer','composer','instrumentalist','remixer','engineer')) then
      raise exception 'Colaboradores inválidos na faixa %.',pos;
    end if;
    if nullif(tr->>'isrc','') is not null
      and (tr->>'isrc') !~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$' then
      raise exception 'ISRC inválido na faixa %.',pos;
    end if;
    if nullif(tr->>'isrc','') is not null
      and (select count(*) from jsonb_array_elements(p->'tracks') t where t->>'isrc'=tr->>'isrc')>1 then
      raise exception 'ISRC duplicado dentro do lançamento.';
    end if;
    audio_path := tr->>'audio_path';
    if audio_path not in (
        uid::text||'/'||rid::text||'/tracks/'||lpad(pos::text,2,'0')||'.wav',
        uid::text||'/'||rid::text||'/tracks/'||lpad(pos::text,2,'0')||'.flac') then
      raise exception 'Caminho de áudio inválido para faixa %.',pos;
    end if;
    select (metadata->>'size')::bigint, lower(coalesce(metadata->>'mimetype',''))
      into v_size,v_mime from storage.objects where bucket_id='audio' and name=audio_path;
    if not found or v_size is null or v_size<1000 or v_size>262144000
      or v_mime not in ('audio/wav','audio/x-wav','audio/wave','audio/flac','audio/x-flac','application/octet-stream') then
      raise exception 'Áudio WAV/FLAC não encontrado ou maior que 250 MB na faixa %.',pos;
    end if;
    if pos=1 then
      first_audio := audio_path;
      first_title := tr->>'title';
      first_isrc := nullif(tr->>'isrc','');
      first_composers := tr->>'composers';
      first_producers := nullif(tr->>'producers','');
      first_lyricists := nullif(tr->>'lyricists','');
      first_credits := nullif(tr->>'credits','');
      first_explicit := coalesce((tr->>'explicit')::boolean,false);
      first_featuring := nullif(tr->>'featured_artists','');
    end if;
  end loop;

  insert into public.releases(
    id,artist_id,title,type,main_artist,featured_artists,genre,subgenre,
    release_date,isrc,upc,composers,producers,lyricists,credits,explicit,
    cover_path,audio_path,status,artists,label_name,p_line,c_line,platforms
  ) values (
    rid,uid,btrim(p->>'title'),kind,main_name,coalesce(featured_names,first_featuring),
    btrim(p->>'genre'),nullif(btrim(coalesce(p->>'subgenre','')),''),
    requested_date,first_isrc,upc_value,first_composers,first_producers,
    first_lyricists,first_credits,first_explicit,cover_path,first_audio,'pending',
    chosen_artists,btrim(p->>'label_name'),btrim(p->>'p_line'),
    btrim(p->>'c_line'),platforms_value
  );
  for pos in 1..track_count loop
    tr := p->'tracks'->(pos-1);
    insert into public.release_tracks(
      release_id,position,title,audio_path,isrc,featured_artists,
      composers,producers,lyricists,credits,contributors,explicit,language
    ) values (
      rid,pos,btrim(tr->>'title'),tr->>'audio_path',nullif(tr->>'isrc',''),
      nullif(tr->>'featured_artists',''),btrim(tr->>'composers'),
      nullif(tr->>'producers',''),nullif(tr->>'lyricists',''),
      nullif(tr->>'credits',''),tr->'contributors',
      coalesce((tr->>'explicit')::boolean,false),tr->>'language'
    );
  end loop;
  return rid;
end;
$$;

revoke all on function public.submit_sintone_release(jsonb) from public,anon;
grant execute on function public.submit_sintone_release(jsonb) to authenticated;

alter table public.reports add column if not exists track_id uuid references public.release_tracks(id) on delete set null;
drop index if exists public.reports_import_key;
create unique index reports_import_key on public.reports (
  artist_id,coalesce(track_id,release_id,'00000000-0000-0000-0000-000000000000'::uuid),
  platform,month
);
create index if not exists reports_track_idx on public.reports(track_id)
  where track_id is not null;

-- Remove only abandoned assets, never assets of an existing release.
drop policy if exists release_upload_delete_abandoned on storage.objects;
create policy release_upload_delete_abandoned on storage.objects
  for delete to authenticated using (
    bucket_id in ('audio','covers')
    and (storage.foldername(name))[1]=(select auth.uid())::text
    and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    and not exists (
      select 1 from public.releases r
      where r.artist_id=(select auth.uid()) and r.id::text=(storage.foldername(name))[2]
    )
  );
CREATE OR REPLACE FUNCTION public.import_royalties(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r jsonb; v_artist uuid; v_release uuid; v_override uuid;
  v_isrc text; v_upc text; v_email text; v_platform text;
  v_month date; v_streams bigint; v_rev numeric; v_count int;
  v_report uuid; v_track uuid; v_imported int:=0; v_affected uuid[]:='{}';
  v_errors jsonb:='[]'; v_key text; v_item text; a uuid;
begin
  if auth.uid() is null or not public.is_admin() or not exists
     (select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'Acesso negado';
  end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>400 then
    raise exception 'Envie um array de até 400 registros por lote'; end if;
  -- Serializa importações concorrentes: evita duplicação na chave mensal existente.
  perform pg_advisory_xact_lock(hashtext('sintone:import_royalties'));
  perform set_config('nodal.skip_balance','1',true);
  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      v_artist:=null;v_release:=null;v_override:=null;v_track:=null;
      v_isrc:=upper(regexp_replace(coalesce(r->>'isrc',''),'[^a-zA-Z0-9]','','g'));
      v_upc:=regexp_replace(coalesce(r->>'upc',''),'[^0-9]','','g');
      v_email:=lower(trim(coalesce(r->>'email','')));
      v_item:=nullif(trim(coalesce(r->>'artist_id','')),'');
      v_key:=coalesce(nullif(v_isrc,''),nullif(v_upc,''),v_item,nullif(v_email,''),'vazio');
      if v_item is not null then v_override:=v_item::uuid; end if;
      v_platform:=trim(coalesce(r->>'platform',''));
      v_month:=(r->>'month')::date;
      v_streams:=(r->>'streams')::bigint;
      v_rev:=(r->>'revenue')::numeric;
      if length(v_platform) not between 1 and 100 or v_month<>date_trunc('month',v_month)::date
        or v_streams<0 or v_streams>1000000000000 or v_rev is null
        or abs(v_rev)>100000000 then raise exception 'Dados de royalties inválidos';end if;

      if v_isrc<>'' then
        select count(*),(array_agg(rt.id))[1],(array_agg(rt.release_id))[1],
          (array_agg(rel.artist_id))[1]
          into v_count,v_track,v_release,v_artist
          from public.release_tracks rt
          join public.releases rel on rel.id=rt.release_id
          where upper(regexp_replace(coalesce(rt.isrc,''),'[^a-zA-Z0-9]','','g'))=v_isrc;
        if v_count=0 then
          select count(*),(array_agg(id))[1],(array_agg(artist_id))[1]
            into v_count,v_release,v_artist from public.releases
            where upper(regexp_replace(coalesce(isrc,''),'[^a-zA-Z0-9]','','g'))=v_isrc;
        end if;
        if v_count<>1 then raise exception 'ISRC não encontrado ou ambíguo'; end if;
      elsif v_upc<>'' then
        select count(*),(array_agg(id))[1],(array_agg(artist_id))[1]
          into v_count,v_release,v_artist from public.releases
          where regexp_replace(coalesce(upc,''),'[^0-9]','','g')=v_upc;
        if v_count<>1 then raise exception 'UPC não encontrado ou ambíguo (precisa ISRC)';end if;
      end if;
      if v_isrc<>'' and v_upc<>'' and not exists(
        select 1 from public.releases where id=v_release
          and regexp_replace(coalesce(upc,''),'[^0-9]','','g')=v_upc
      ) then raise exception 'UPC e ISRC apontam para lançamentos diferentes'; end if;
      if v_override is not null then
        if v_artist is not null and v_artist<>v_override then
          raise exception 'ID do artista não corresponde ao lançamento';end if;
        v_artist:=v_override;
      end if;
      if v_artist is null and v_email<>'' then
        select id into v_artist from public.profiles where lower(email)=v_email limit 1;
      end if;
      if v_artist is null or not exists
        (select 1 from public.profiles where id=v_artist and role='artist') then
        raise exception 'Artista não encontrado';end if;
      if v_email<>'' and exists(select 1 from public.profiles
        where id=v_artist and lower(email)<>v_email) then
        raise exception 'E-mail e identificador apontam para artistas diferentes';end if;
      select id into v_report from public.reports
        where artist_id=v_artist and release_id is not distinct from v_release
          and track_id is not distinct from v_track
          and platform=v_platform and month=v_month for update;
      if v_report is null then
        insert into public.reports(artist_id,release_id,track_id,platform,month,streams,revenue)
          values(v_artist,v_release,v_track,v_platform,v_month,v_streams,v_rev);
      else
        update public.reports set streams=v_streams,revenue=v_rev where id=v_report;
      end if;
      v_imported:=v_imported+1;
      v_affected:=array_append(v_affected,v_artist);
    exception when others then
      v_errors:=v_errors||jsonb_build_object('key',v_key,'platform',r->>'platform',
        'month',r->>'month','lines',r->'lines','reason',sqlerrm);
    end;
  end loop;
  perform set_config('nodal.skip_balance','0',true);
  for a in select distinct unnest(v_affected) loop
    perform public.recalc_balance(a);
  end loop;
  return jsonb_build_object('imported',v_imported,
    'artists',(select count(distinct x) from unnest(v_affected) x),'errors',v_errors);
end $function$;

revoke all on function public.import_royalties(jsonb) from public,anon;
grant execute on function public.import_royalties(jsonb) to authenticated;
commit;
