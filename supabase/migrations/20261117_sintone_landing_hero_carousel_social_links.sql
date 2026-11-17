begin;
alter table public.landing_page_config
 add column if not exists hero_banners jsonb not null default '[]'::jsonb,
 add column if not exists social_links jsonb not null default '{}'::jsonb;
update public.landing_page_config set hero_banners=jsonb_build_array(hero_image_url)
 where hero_image_url is not null and hero_image_url<>'' and hero_banners='[]'::jsonb;
alter table public.landing_page_config drop constraint if exists sintone_hero_banners_array_check;
alter table public.landing_page_config add constraint sintone_hero_banners_array_check
 check (jsonb_typeof(hero_banners)='array' and jsonb_array_length(hero_banners)<=6);
alter table public.landing_page_config drop constraint if exists sintone_social_links_object_check;
alter table public.landing_page_config add constraint sintone_social_links_object_check
 check (jsonb_typeof(social_links)='object');
commit;
