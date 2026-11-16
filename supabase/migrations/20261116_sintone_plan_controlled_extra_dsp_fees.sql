-- Taxas extras por plano. Gratuito nunca isento. Banco em produção: nodalmusic.
begin;
alter table public.billing_plans add column if not exists charge_extra_platform_fees boolean not null default true;
update public.billing_plans set charge_extra_platform_fees=true where price_brl=0;
alter table public.billing_plans drop constraint if exists billing_free_must_charge_extra_platform_fees;
alter table public.billing_plans add constraint billing_free_must_charge_extra_platform_fees check(price_brl<>0 or charge_extra_platform_fees=true);
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
    or (kind='ep' and track_count not between 2 and 4)
    or (kind='album' and track_count not between 5 and 100)
    or (kind not in ('single','ep','album') or kind is null) then
    raise exception 'Single deve ter 1 faixa, EP 2 a 4 e álbum 5 a 100.';
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
  if (select count(*) from jsonb_array_elements(chosen_artists) a where a->>'role'='primary')<1 then
    raise exception 'Informe pelo menos um artista primário.';
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
  if coalesce(array_length(platforms_value,1),0) not between 1 and 100
    or exists(select 1 from unnest(platforms_value) chosen where not exists(
       select 1 from public.dsp_settings d where d.name=chosen and d.active))
    then raise exception 'Plataforma indisponível ou inválida.';end if;

  if cardinality(plan_row.included_stores)>0 and exists(
    select 1 from unnest(platforms_value) store where not(store=any(plan_row.included_stores))
  ) then raise exception 'Uma ou mais lojas não fazem parte do seu plano'; end if;

  if exists(select 1 from unnest(platforms_value) chosen
     where not exists(select 1 from public.dsp_settings ds where ds.name=chosen and ds.active=true))
     then raise exception 'Plataforma desabilitada para novos lançamentos.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('slug',d.slug,'name',d.name,'fee',d.extra_fee) order by d.slug),'[]'::jsonb)
   into v_items from public.dsp_settings d
   where d.name=any(platforms_value) and d.active and d.is_extra and d.extra_fee>0
     and plan_row.charge_extra_platform_fees
     and not(plan_row.price_brl>0 and plan_row.has_instagram_included and d.name='Instagram');
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
          or c->>'role' not in ('featured','producer','composer','instrumentalist','remixer','engineer','vocal')) then
      raise exception 'Colaboradores inválidos na faixa %.',pos;
    end if;
    if (tr->>'duration_seconds') is null or (tr->>'duration_seconds') !~ '^[0-9]{1,4}$'
      or (tr->>'duration_seconds')::integer not between 5 and 1800
      or (tr->>'audio_sample_rate')::integer not in (44100,96000)
      or (tr->>'audio_bit_depth')::integer not in (16,24)
      or not ((tr->>'audio_sample_rate')='44100' and (tr->>'audio_bit_depth')='16'
       or (tr->>'audio_sample_rate')='96000' and (tr->>'audio_bit_depth')='24') then
      raise exception 'Qualidade ou duração do áudio inválida na faixa %.',pos;
    end if;
    if not exists (select 1 from jsonb_array_elements(tr->'contributors') c where c->>'role'='vocal')
       or not exists (select 1 from jsonb_array_elements(tr->'contributors') c where c->>'role'='producer')
       then raise exception 'Informe vocal e produtor na faixa %.',pos; end if;
    if coalesce(tr->>'is_original','') not in ('true','false')
       or coalesce(tr->>'is_instrumental','') not in ('true','false')
       or coalesce(tr->>'is_remix','') not in ('true','false')
       then raise exception 'Dados de versão ausentes na faixa %.',pos; end if;
    if (tr->>'tiktok_preview_start') is not null and
       ((tr->>'tiktok_preview_start') !~ '^[0-9]{1,4}$'
        or (tr->>'tiktok_preview_start')::int > (tr->>'duration_seconds')::int)
      then raise exception 'Trecho TikTok inválido na faixa %.',pos; end if;
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
    release_mode,territories,publishing_rights,youtube_content_id_requested,release_time,upc_provisional,language
  ) values (
    rid,uid,btrim(p->>'title'),kind,main_name,coalesce(featured_names,first_featuring),
    btrim(p->>'genre'),nullif(btrim(coalesce(p->>'subgenre','')),''),
    requested_date,first_isrc,upc_value,first_composers,first_producers,
    first_lyricists,first_credits,first_explicit,cover_path,first_audio,'pending',
    chosen_artists,btrim(p->>'label_name'),btrim(p->>'p_line'),
    btrim(p->>'c_line'),platforms_value,clock_timestamp(),'sintone-release-rights-2026-11',
    coalesce(p->>'release_mode','local'),array(select jsonb_array_elements_text(coalesce(p->'territories','["WORLD"]'::jsonb))),
    coalesce((p->>'publishing_rights')::numeric,100),coalesce((p->>'youtube_content_id_requested')::boolean,false),
    coalesce(nullif(p->>'release_time','')::time,'00:00'::time),false,
    coalesce(nullif(p->>'language',''),'pt')
  );
  for pos in 1..track_count loop
    tr := p->'tracks'->(pos-1);
    insert into public.release_tracks(
      release_id,position,title,audio_path,isrc,featured_artists,
      composers,producers,lyricists,credits,contributors,explicit,language,genre,subgenre,duration_seconds,is_original,is_instrumental,is_remix,tiktok_preview_start,audio_sample_rate,audio_bit_depth
    ) values (
      rid,pos,btrim(tr->>'title'),tr->>'audio_path',nullif(tr->>'isrc',''),
      nullif(tr->>'featured_artists',''),btrim(tr->>'composers'),
      nullif(tr->>'producers',''),nullif(tr->>'lyricists',''),
      nullif(tr->>'credits',''),tr->'contributors',
      coalesce((tr->>'explicit')::boolean,false),tr->>'language',
      nullif(btrim(coalesce(tr->>'genre','')),''),nullif(btrim(coalesce(tr->>'subgenre','')),''),
      case when jsonb_typeof(tr->'duration_seconds')='number' then (tr->>'duration_seconds')::integer else null end,
      (tr->>'is_original')::boolean,(tr->>'is_instrumental')::boolean,(tr->>'is_remix')::boolean,
      coalesce((tr->>'tiktok_preview_start')::integer,0),(tr->>'audio_sample_rate')::integer,(tr->>'audio_bit_depth')::integer
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
$function$;
commit;
