-- SINTONE: requires owned artist profiles and supports 62 named DSP options.
-- Legacy platform names remain accepted for already-open forms during rollout.
begin;
alter table public.releases
  add column if not exists platform_selection_mode text not null default 'selected';
do $guard$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.releases'::regclass
   and conname='releases_platform_selection_mode_chk') then
   alter table public.releases add constraint releases_platform_selection_mode_chk
     check (platform_selection_mode in ('all','selected'));
 end if;
end $guard$;

create or replace function public.sintone_supported_dsps() returns text[]
language sql immutable set search_path = public, pg_temp
as $dsps$ select array['7Digital','Amazon','Ami','Anghami','Apple Music','Apple Music 1','AWA','Beatport','Bmat','Boomplay','Bugs!','Deezer','Dreamus Company (Flo)','Facebook','Facebook Audio Library','Facebook Fingerprinting','Facebook Video','Facebook Video Figerprint','Fizy','FLO Music','Genie Music','Gracenote','Hungama','iHeartRadio','iHeart Radio US','iMusica','Jaxsta Music','JioSaavn','Joox','KKBox','KKBOXMY','Kuack Media','Kuaishou','LINE Music','Lyricfind','Meplaylist','Mixcloud','Muska','Napster','Naver','Naver Vibe','Nuuday A/S','Pandora','Peloton','Phononet','Pretzel Rocks','Qobuz','Resso','Snap','Soundcloud','Spotify','Spotify Discovery Mode','Tencent','Tidal','TikTok','Touchtunes','Trebel','United Media Agency (Uma)','Xite','Yandex Music','Youtube Music','Zvooq']::text[] $dsps$;
revoke all on function public.sintone_supported_dsps() from public,anon;
grant execute on function public.sintone_supported_dsps() to authenticated;

CREATE OR REPLACE FUNCTION public.submit_sintone_release(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  if coalesce((p->>'rights_confirmed')::boolean,false) is distinct from true then
    raise exception 'Você deve confirmar os direitos autorais e autorizações.';
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
  if requested_date is null or requested_date<current_date or requested_date>current_date+interval '3 years' then
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
  if (select count(distinct value->>'profile_id') from jsonb_array_elements(chosen_artists))<>artist_count then
    raise exception 'O mesmo artista não pode ser selecionado mais de uma vez.';
  end if;
  for artist_item in select value from jsonb_array_elements(chosen_artists) loop
    if btrim(coalesce(artist_item->>'name',''))='' or length(artist_item->>'name')>120
      or coalesce(artist_item->>'role','') not in ('primary','featured','remixer') then
      raise exception 'Artista, nome ou função inválidos.';
    end if;
    if nullif(artist_item->>'profile_id','') is null
      or not exists(select 1 from public.artist_profiles ap
        where ap.id=nullif(artist_item->>'profile_id','')::uuid and ap.owner_id=uid
          and btrim(ap.name)=btrim(artist_item->>'name')) then
      raise exception 'Selecione apenas artistas cadastrados na sua conta.';
    end if;
  end loop;
  select value->>'name' into main_name
    from jsonb_array_elements(chosen_artists) where value->>'role'='primary' limit 1;
  select nullif(string_agg(value->>'name',', '),'') into featured_names
    from jsonb_array_elements(chosen_artists) where value->>'role'='featured';

  select array_agg(distinct value) into platforms_value
    from jsonb_array_elements_text(p->'platforms');
  if coalesce(array_length(platforms_value,1),0) not between 1 and 66
    or exists(select 1 from unnest(platforms_value) x
      where x is null or x <> all(public.sintone_supported_dsps() || array['YouTube Music','Amazon Music','Instagram/Facebook','SoundCloud']::text[])) then
    raise exception 'Selecione apenas plataformas válidas.';
  end if;
  if coalesce(p->>'platform_selection_mode','selected') not in ('all','selected') then
    raise exception 'Modo de seleção de plataformas inválido.';
  end if;
  if coalesce(p->>'platform_selection_mode','selected')='all'
    and (cardinality(platforms_value)<>cardinality(public.sintone_supported_dsps())
      or (platforms_value @> public.sintone_supported_dsps()) is distinct from true) then
    raise exception 'Para todas as plataformas, informe a lista completa.';
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
    cover_path,audio_path,status,artists,label_name,p_line,c_line,platforms,platform_selection_mode,
    rights_confirmed_at,rights_declaration_version
  ) values (
    rid,uid,btrim(p->>'title'),kind,main_name,coalesce(featured_names,first_featuring),
    btrim(p->>'genre'),nullif(btrim(coalesce(p->>'subgenre','')),''),
    requested_date,first_isrc,upc_value,first_composers,first_producers,
    first_lyricists,first_credits,first_explicit,cover_path,first_audio,'pending',
    chosen_artists,btrim(p->>'label_name'),btrim(p->>'p_line'),
    btrim(p->>'c_line'),platforms_value,coalesce(p->>'platform_selection_mode','selected'),clock_timestamp(),'sintone-release-rights-2026-11'
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
$function$;
revoke all on function public.submit_sintone_release(jsonb) from public,anon;
grant execute on function public.submit_sintone_release(jsonb) to authenticated;
commit;
