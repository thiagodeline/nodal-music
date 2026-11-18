begin;
create table if not exists public.blog_posts(
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(title) between 3 and 180),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug)<=160),
 summary text not null default '' check(char_length(summary)<=500),
 content text not null default '' check(char_length(content)<=100000),
 cover_image text,
 category text not null default 'Tutoriais' check(category in ('Comparativos','Direitos Autorais','Marketing Musical','Tutoriais','Mercado Musical')),
 tags text[] not null default '{}',
 author_name text not null default 'Equipe Sintone' check(char_length(author_name)<=100),
 status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED')),
 views_count integer not null default 0 check(views_count>=0),
 seo_title text not null default '' check(char_length(seo_title)<=100),
 seo_description text not null default '' check(char_length(seo_description)<=250),
 focus_keywords text[] not null default '{}',
 canonical_url text,
 is_indexable boolean not null default true,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint blog_published_content check(status<>'PUBLISHED' or (char_length(content)>0 and published_at is not null))
);
create index if not exists blog_posts_public_idx on public.blog_posts(status,published_at desc);
create index if not exists blog_posts_category_idx on public.blog_posts(category,status,published_at desc);
alter table public.blog_posts enable row level security;
drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts for select to anon,authenticated using(status='PUBLISHED' or public.is_admin());
drop policy if exists blog_posts_admin_insert on public.blog_posts;
create policy blog_posts_admin_insert on public.blog_posts for insert to authenticated with check(public.is_admin());
drop policy if exists blog_posts_admin_update on public.blog_posts;
create policy blog_posts_admin_update on public.blog_posts for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists blog_posts_admin_delete on public.blog_posts;
create policy blog_posts_admin_delete on public.blog_posts for delete to authenticated using(public.is_admin());
grant select on public.blog_posts to anon,authenticated;
grant insert,update,delete on public.blog_posts to authenticated;
drop policy if exists sintone_blog_admin_insert on storage.objects;
create policy sintone_blog_admin_insert on storage.objects for insert to authenticated
 with check(bucket_id='public-assets' and name like 'blog/%' and public.is_admin());
drop policy if exists sintone_blog_admin_delete on storage.objects;
create policy sintone_blog_admin_delete on storage.objects for delete to authenticated
 using(bucket_id='public-assets' and name like 'blog/%' and public.is_admin());
create or replace function public.blog_increment_view(post_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
 update public.blog_posts set views_count=views_count+1
 where id=post_id and status='PUBLISHED';
end; $$;
revoke all on function public.blog_increment_view(uuid) from public,anon,authenticated;
grant execute on function public.blog_increment_view(uuid) to service_role;
commit;