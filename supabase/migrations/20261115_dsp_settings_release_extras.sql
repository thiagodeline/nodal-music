-- SINTONE: gerência de DSPs e pagamento verificado de extras por lançamento
-- Já aplicado ao Supabase de produção; mantenha sob controle de versão.
begin;
create table if not exists public.dsp_settings(
 id uuid primary key default gen_random_uuid(),
 name text not null unique, slug text not null unique, logo_url text,
 category text not null default 'streaming' check(category in ('streaming','social','extra')),
 is_extra boolean not null default false,
 extra_fee numeric(10,2) not null default 0 check(extra_fee between 0 and 100000),
 active boolean not null default true, created_at timestamptz not null default now()
);
create index if not exists dsp_settings_active on public.dsp_settings(active);
alter table public.dsp_settings enable row level security;
drop policy if exists dsp_settings_catalog_read on public.dsp_settings;
create policy dsp_settings_catalog_read on public.dsp_settings for select to authenticated using(active or public.is_admin());
drop policy if exists dsp_settings_admin_write on public.dsp_settings;
create policy dsp_settings_admin_write on public.dsp_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
revoke insert,delete on public.dsp_settings from authenticated,anon;
grant select,update on public.dsp_settings to authenticated;
insert into public.dsp_settings(name,slug,category) values
 ('7Digital','7digital','streaming'),
 ('Amazon','amazon','streaming'),
 ('Ami','ami','streaming'),
 ('Anghami','anghami','streaming'),
 ('Apple Music','apple-music','streaming'),
 ('Apple Music 1','apple-music-1','streaming'),
 ('AWA','awa','streaming'),
 ('Beatport','beatport','streaming'),
 ('Bmat','bmat','streaming'),
 ('Boomplay','boomplay','streaming'),
 ('Bugs!','bugs','streaming'),
 ('Deezer','deezer','streaming'),
 ('Dreamus Company (Flo)','dreamus-company-flo','streaming'),
 ('Facebook','facebook','social'),
 ('Facebook Audio Library','facebook-audio-library','social'),
 ('Facebook Fingerprinting','facebook-fingerprinting','social'),
 ('Facebook Video','facebook-video','social'),
 ('Facebook Video Figerprint','facebook-video-figerprint','social'),
 ('Fizy','fizy','streaming'),
 ('FLO Music','flo-music','streaming'),
 ('Genie Music','genie-music','streaming'),
 ('Gracenote','gracenote','streaming'),
 ('Hungama','hungama','streaming'),
 ('iHeartRadio','iheartradio','streaming'),
 ('iHeart Radio US','iheart-radio-us','streaming'),
 ('iMusica','imusica','streaming'),
 ('Jaxsta Music','jaxsta-music','streaming'),
 ('JioSaavn','jiosaavn','streaming'),
 ('Joox','joox','streaming'),
 ('KKBox','kkbox','streaming'),
 ('KKBOXMY','kkboxmy','streaming'),
 ('Kuack Media','kuack-media','streaming'),
 ('Kuaishou','kuaishou','social'),
 ('LINE Music','line-music','streaming'),
 ('Lyricfind','lyricfind','streaming'),
 ('Meplaylist','meplaylist','streaming'),
 ('Mixcloud','mixcloud','streaming'),
 ('Muska','muska','streaming'),
 ('Napster','napster','streaming'),
 ('Naver','naver','streaming'),
 ('Naver Vibe','naver-vibe','streaming'),
 ('Nuuday A/S','nuuday-a-s','streaming'),
 ('Pandora','pandora','streaming'),
 ('Peloton','peloton','streaming'),
 ('Phononet','phononet','streaming'),
 ('Pretzel Rocks','pretzel-rocks','streaming'),
 ('Qobuz','qobuz','streaming'),
 ('Resso','resso','streaming'),
 ('Snap','snap','social'),
 ('Soundcloud','soundcloud','streaming'),
 ('Spotify','spotify','streaming'),
 ('Spotify Discovery Mode','spotify-discovery-mode','streaming'),
 ('Tencent','tencent','streaming'),
 ('Tidal','tidal','streaming'),
 ('TikTok','tiktok','social'),
 ('Touchtunes','touchtunes','streaming'),
 ('Trebel','trebel','streaming'),
 ('United Media Agency (Uma)','united-media-agency-uma','streaming'),
 ('Xite','xite','streaming'),
 ('Yandex Music','yandex-music','streaming'),
 ('Youtube Music','youtube-music','streaming'),
 ('Zvooq','zvooq','streaming')
on conflict(name) do nothing;

alter table public.billing_one_time_orders drop constraint if exists billing_one_time_orders_order_kind_check;
alter table public.billing_one_time_orders add constraint billing_one_time_orders_order_kind_check
 check(order_kind in ('plan','instagram_addon','release_extras'));
alter table public.billing_one_time_orders add column if not exists extra_items jsonb not null default '[]'::jsonb;
create index if not exists release_extras_order_index
 on public.billing_one_time_orders(user_id,release_id,status) where order_kind='release_extras';

alter table public.releases add column if not exists release_mode text not null default 'local' check(release_mode in ('local','global'));
alter table public.releases add column if not exists territories text[] not null default array['WORLD']::text[];
alter table public.releases add column if not exists publishing_rights numeric(5,2) not null default 100 check(publishing_rights between 0 and 100);
alter table public.releases add column if not exists youtube_content_id_requested boolean not null default false;
alter table public.release_tracks add column if not exists genre text;
alter table public.release_tracks add column if not exists subgenre text;
create table if not exists public.release_extra_fees(
 id uuid primary key default gen_random_uuid(),
 release_id uuid not null references public.releases(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 dsp_slug text not null references public.dsp_settings(slug),
 fee_charged numeric(10,2) not null check(fee_charged>=0),
 paid boolean not null default false,
 payment_order_id uuid references public.billing_one_time_orders(id),
 created_at timestamptz not null default now(),
 unique(release_id,dsp_slug)
);
alter table public.release_extra_fees enable row level security;
drop policy if exists release_extra_fees_user_read on public.release_extra_fees;
create policy release_extra_fees_user_read on public.release_extra_fees for select to authenticated using(user_id=auth.uid() or public.is_admin());
revoke insert,update,delete on public.release_extra_fees from authenticated,anon;
grant select on public.release_extra_fees to authenticated;
CREATE OR REPLACE FUNCTION public.apply_verified_one_time_order(p_order_id uuid, p_mp_order_id text, p_payment_state text, p_amount numeric)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order public.billing_one_time_orders%rowtype;
declare v_sub_id uuid;v_existing_exp timestamptz;v_until timestamptz;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
    and auth.role() is distinct from 'service_role' then raise exception 'Permissão negada';end if;
 if p_payment_state not in ('paid','rejected','refunded') then raise exception 'Estado inválido';end if;
 select * into v_order from public.billing_one_time_orders where id=p_order_id for update;
 if not found or v_order.mp_order_id is distinct from p_mp_order_id then raise exception 'Pedido não associado';end if;
 if abs(v_order.amount_brl-p_amount)>0.01 then raise exception 'Valor divergente';end if;
 if v_order.status='paid' and p_payment_state='paid' then return 'already_paid';end if;
 if v_order.status='refunded' and p_payment_state='paid' then return 'already_refunded';end if;
 if p_payment_state='rejected' then
   if v_order.status='pending' then
     update public.billing_one_time_orders set status='rejected' where id=p_order_id;
   end if;
   return 'rejected';
 end if;
 if p_payment_state='refunded' then
   update public.billing_one_time_orders set status='refunded' where id=p_order_id;
   if v_order.order_kind='plan' then
    update public.billing_subscriptions set status='expired',access_expires_at=now(),updated_at=now()
    where user_id=v_order.user_id and last_order_id=p_order_id and status='authorized';
   end if;
   return 'refunded';
 end if;
 if v_order.order_kind in ('instagram_addon','release_extras') then
  if v_order.release_id is null then raise exception 'Add-on sem lançamento';end if;
  update public.billing_one_time_orders set status='paid',confirmed_at=now() where id=p_order_id;
  return 'addon_paid';
 end if;
 select id,access_expires_at into v_sub_id,v_existing_exp
 from public.billing_subscriptions
 where user_id=v_order.user_id and plan_id=v_order.plan_id and status='authorized'
 for update;
 v_until=greatest(now(),coalesce(v_existing_exp,now()))+interval '30 days';
 if v_sub_id is null then
   update public.billing_subscriptions set status='expired',updated_at=now()
    where user_id=v_order.user_id and status in ('free','authorized');
   insert into public.billing_subscriptions(user_id,plan_id,status,price_at_signup,access_expires_at,last_verified_at,last_order_id)
   values(v_order.user_id,v_order.plan_id,'authorized',v_order.amount_brl,v_until,now(),p_order_id);
 else
   update public.billing_subscriptions set access_expires_at=v_until,last_verified_at=now(),last_order_id=p_order_id,
    updated_at=now() where id=v_sub_id;
 end if;
 update public.billing_one_time_orders set status='paid',confirmed_at=now() where id=p_order_id;
 return 'paid';
end;$function$
;

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
  plan_row public.billing_plans%rowtype;
  v_month_count integer;
  v_uses_meta boolean;
  v_items jsonb := '[]'::jsonb;
  v_paid_order public.billing_one_time_orders%rowtype;
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

  if not exists (
    select 1 from public.billing_subscriptions bs
    where bs.user_id=uid and
      (bs.status='free' or
       (bs.status='authorized' and bs.access_expires_at>now()))
  ) then
    raise exception 'Seu plano está expirado, assine algum plano para continuar lançando músicas.';
  end if;

  select * into plan_row from public.billing_plans bp
   where bp.id=public.current_sintone_plan(uid);
  if not found then raise exception 'Não foi possível localizar seu plano atual';end if;
  -- serializar limites por conta, evitando duas submissões simultâneas no último slot
  select count(*) into v_month_count from public.releases r
   where r.artist_id=uid and r.created_at >= date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
     and r.created_at < (date_trunc('month',now() at time zone 'America/Sao_Paulo')+interval '1 month') at time zone 'America/Sao_Paulo';
  if plan_row.monthly_releases_limit is not null and v_month_count>=plan_row.monthly_releases_limit
   then raise exception 'Limite mensal de lançamentos atingido para este plano';end if;

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
  if requested_date is null or requested_date<((now() at time zone 'America/Sao_Paulo')::date+14) or requested_date>((now() at time zone 'America/Sao_Paulo')::date+interval '3 years') then
    raise exception 'Escolha uma data a partir de 14 dias no futuro.';
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
    if nullif(artist_item->>'profile_id','') is null
      or not exists(select 1 from public.artist_profiles ap
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
  if coalesce(array_length(platforms_value,1),0) not between 1 and 62
    or exists(select 1 from unnest(platforms_value) x
      where x not in ('7Digital','Amazon','Ami','Anghami','Apple Music','Apple Music 1','AWA','Beatport','Bmat','Boomplay','Bugs!','Deezer','Dreamus Company (Flo)','Facebook','Facebook Audio Library','Facebook Fingerprinting','Facebook Video','Facebook Video Figerprint','Fizy','FLO Music','Genie Music','Gracenote','Hungama','iHeartRadio','iHeart Radio US','iMusica','Jaxsta Music','JioSaavn','Joox','KKBox','KKBOXMY','Kuack Media','Kuaishou','LINE Music','Lyricfind','Meplaylist','Mixcloud','Muska','Napster','Naver','Naver Vibe','Nuuday A/S','Pandora','Peloton','Phononet','Pretzel Rocks','Qobuz','Resso','Snap','Soundcloud','Spotify','Spotify Discovery Mode','Tencent','Tidal','TikTok','Touchtunes','Trebel','United Media Agency (Uma)','Xite','Yandex Music','Youtube Music','Zvooq')) then
    raise exception 'Selecione pelo menos uma plataforma válida.';
  end if;

  if cardinality(plan_row.included_stores)>0 and exists(
    select 1 from unnest(platforms_value) store where not(store=any(plan_row.included_stores))
  ) then raise exception 'Uma ou mais lojas não fazem parte do seu plano'; end if;

  if exists(select 1 from unnest(platforms_value) chosen
     where not exists(select 1 from public.dsp_settings ds where ds.name=chosen and ds.active=true))
     then raise exception 'Plataforma desabilitada para novos lançamentos.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('slug',d.slug,'name',d.name,'fee',d.extra_fee) order by d.slug),'[]'::jsonb)
   into v_items from public.dsp_settings d
   where d.name=any(platforms_value) and d.active and d.is_extra and d.extra_fee>0
     and not(plan_row.has_instagram_included and d.name in
      ('Facebook','Facebook Audio Library','Facebook Fingerprinting','Facebook Video','Facebook Video Figerprint'));
  -- Legado: taxa Instagram definida no plano, cobrada no mesmo Pix das demais DSPs.
  if exists(select 1 from unnest(platforms_value) n where n in
    ('Facebook','Facebook Audio Library','Facebook Fingerprinting','Facebook Video','Facebook Video Figerprint'))
    and not plan_row.has_instagram_included and plan_row.instagram_addon_fee>0
    and not exists(select 1 from jsonb_array_elements(v_items) item
     where item->>'name' in ('Facebook','Facebook Audio Library','Facebook Fingerprinting','Facebook Video','Facebook Video Figerprint'))
   then
    v_items:=v_items||jsonb_build_array(jsonb_build_object('slug','meta-legacy',
      'name','Instagram/Facebook (plano)','fee',plan_row.instagram_addon_fee));
  end if;
  if jsonb_array_length(v_items)>0 then
    select * into v_paid_order from public.billing_one_time_orders b
     where b.user_id=uid and b.release_id=rid and b.order_kind='release_extras'
       and b.status='paid' and b.plan_id=plan_row.id
     order by b.confirmed_at desc limit 1 for update;
    if not found then raise exception 'Confirme o pagamento das plataformas extras antes do envio.';end if;
    if jsonb_array_length(v_paid_order.extra_items)<>jsonb_array_length(v_items)
      or exists(select 1 from jsonb_array_elements(v_items) item
         where not exists(select 1 from jsonb_array_elements(v_paid_order.extra_items) paid
          where paid->>'slug'=item->>'slug' and paid->>'name'=item->>'name'))
    then raise exception 'A seleção de extras mudou depois do pagamento. Consulte o suporte.';end if;
  end if;

  if coalesce(p->>'release_mode','local') not in ('local','global') then raise exception 'Modalidade de lançamento inválida'; end if;
  if jsonb_typeof(coalesce(p->'territories','["WORLD"]'::jsonb))<>'array'
    or jsonb_array_length(coalesce(p->'territories','["WORLD"]'::jsonb)) not between 1 and 150
    or exists(select 1 from jsonb_array_elements_text(coalesce(p->'territories','["WORLD"]'::jsonb)) t
      where t<>'WORLD' and t !~ '^[A-Z]{2}$')
   then raise exception 'Territórios inválidos';end if;
  if (p->>'publishing_rights') is not null and
    (p->>'publishing_rights')::numeric not between 0 and 100
   then raise exception 'Porcentagem de direitos inválida';end if;

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
    cover_path,audio_path,status,artists,label_name,p_line,c_line,platforms,
    rights_confirmed_at,rights_declaration_version,
    release_mode,territories,publishing_rights,youtube_content_id_requested
  ) values (
    rid,uid,btrim(p->>'title'),kind,main_name,coalesce(featured_names,first_featuring),
    btrim(p->>'genre'),nullif(btrim(coalesce(p->>'subgenre','')),''),
    requested_date,first_isrc,upc_value,first_composers,first_producers,
    first_lyricists,first_credits,first_explicit,cover_path,first_audio,'pending',
    chosen_artists,btrim(p->>'label_name'),btrim(p->>'p_line'),
    btrim(p->>'c_line'),platforms_value,clock_timestamp(),'sintone-release-rights-2026-11',
    coalesce(p->>'release_mode','local'),array(select jsonb_array_elements_text(coalesce(p->'territories','["WORLD"]'::jsonb))),
    coalesce((p->>'publishing_rights')::numeric,100),coalesce((p->>'youtube_content_id_requested')::boolean,false)
  );
  for pos in 1..track_count loop
    tr := p->'tracks'->(pos-1);
    insert into public.release_tracks(
      release_id,position,title,audio_path,isrc,featured_artists,
      composers,producers,lyricists,credits,contributors,explicit,language,genre,subgenre
    ) values (
      rid,pos,btrim(tr->>'title'),tr->>'audio_path',nullif(tr->>'isrc',''),
      nullif(tr->>'featured_artists',''),btrim(tr->>'composers'),
      nullif(tr->>'producers',''),nullif(tr->>'lyricists',''),
      nullif(tr->>'credits',''),tr->'contributors',
      coalesce((tr->>'explicit')::boolean,false),tr->>'language',
      nullif(btrim(coalesce(tr->>'genre','')),''),nullif(btrim(coalesce(tr->>'subgenre','')),'')
    );
  end loop;
  if jsonb_array_length(v_items)>0 then
    insert into public.release_extra_fees(release_id,user_id,dsp_slug,fee_charged,paid,payment_order_id)
      select rid,uid,x->>'slug',(x->>'fee')::numeric,true,v_paid_order.id
      from jsonb_array_elements(v_paid_order.extra_items) x
      where x->>'slug'<>'meta-legacy';
  end if;
  return rid;
end;
$function$
;
commit;
