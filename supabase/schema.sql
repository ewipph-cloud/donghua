create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter table public.admin_users enable row level security;

drop policy if exists "Admins can view their own membership" on public.admin_users;
create policy "Admins can view their own membership"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-images',
  'content-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload content images" on storage.objects;
create policy "Admins can upload content images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-images'
    and (select private.is_admin())
  );

drop policy if exists "Admins can delete content images" on storage.objects;
create policy "Admins can delete content images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content-images'
    and (select private.is_admin())
  );

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public;

create table if not exists public.anime_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  synopsis text not null default '',
  content_type text not null default 'donghua'
    constraint anime_content_content_type_check check (content_type in ('donghua', 'anime')),
  genre text not null,
  status text not null default 'ongoing'
    check (status in ('ongoing', 'completed', 'upcoming')),
  year integer not null check (year between 1950 and 2100),
  latest_episode text not null default '',
  rating numeric(3, 1) not null default 0 check (rating between 0 and 10),
  poster_url text,
  banner_url text,
  stream_url text,
  stream_url_okru text,
  stream_url_dailymotion text,
  stream_url_dailymotion_audio text,
  featured boolean not null default false,
  published boolean not null default false,
  views bigint not null default 0 check (views >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anime_content
  add column if not exists content_type text not null default 'donghua',
  add column if not exists stream_url_okru text,
  add column if not exists stream_url_dailymotion text,
  add column if not exists stream_url_dailymotion_audio text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'anime_content_content_type_check'
      and conrelid = 'public.anime_content'::regclass
  ) then
    alter table public.anime_content
      add constraint anime_content_content_type_check
      check (content_type in ('donghua', 'anime'));
  end if;
end;
$$;

create index if not exists anime_content_published_updated_idx
  on public.anime_content (published, updated_at desc);
create index if not exists anime_content_genre_idx
  on public.anime_content (genre);

create or replace function public.increment_anime_content_views(content_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  update public.anime_content
  set views = views + 1
  where slug = content_slug
    and published;

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

revoke all on function public.increment_anime_content_views(text) from public;
grant execute on function public.increment_anime_content_views(text) to anon, authenticated;

create table if not exists public.anime_episodes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.anime_content (id) on delete cascade,
  episode_number integer not null check (episode_number >= 0),
  title text not null default '',
  stream_url text,
  stream_url_okru text,
  stream_url_dailymotion text,
  stream_url_dailymotion_audio text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, episode_number)
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  body text not null,
  published boolean not null default false,
  content_id uuid references public.anime_content (id) on delete set null,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_notification_subscriptions (
  telegram_user_id bigint primary key,
  first_name text not null,
  username text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles
  add column if not exists published boolean not null default false,
  add column if not exists content_id uuid references public.anime_content (id) on delete set null,
  add column if not exists cover_image_url text;

alter table public.anime_episodes
  add column if not exists stream_url_okru text,
  add column if not exists stream_url_dailymotion text,
  add column if not exists stream_url_dailymotion_audio text;

create index if not exists anime_episodes_content_number_idx
  on public.anime_episodes (content_id, episode_number desc);

drop trigger if exists anime_content_set_updated_at on public.anime_content;
create trigger anime_content_set_updated_at
  before update on public.anime_content
  for each row execute function private.set_updated_at();

drop trigger if exists anime_episodes_set_updated_at on public.anime_episodes;
create trigger anime_episodes_set_updated_at
  before update on public.anime_episodes
  for each row execute function private.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function private.set_updated_at();

drop trigger if exists telegram_notification_subscriptions_set_updated_at
  on public.telegram_notification_subscriptions;
create trigger telegram_notification_subscriptions_set_updated_at
  before update on public.telegram_notification_subscriptions
  for each row execute function private.set_updated_at();

alter table public.anime_content enable row level security;
alter table public.anime_episodes enable row level security;
alter table public.articles enable row level security;
alter table public.telegram_notification_subscriptions enable row level security;

revoke all on public.admin_users, public.anime_content, public.anime_episodes, public.articles from public;
revoke all on public.admin_users, public.anime_content, public.anime_episodes, public.articles from anon, authenticated;
revoke all on public.telegram_notification_subscriptions from public, anon, authenticated;
grant all on public.telegram_notification_subscriptions to service_role;
grant select on public.anime_content, public.anime_episodes to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.anime_content, public.anime_episodes, public.articles to authenticated;
grant usage on schema public to anon, authenticated;

drop policy if exists "Published content is visible to everyone" on public.anime_content;
create policy "Published content is visible to everyone"
  on public.anime_content for select
  using (published or (select private.is_admin()));

drop policy if exists "Admins can insert content" on public.anime_content;
create policy "Admins can insert content"
  on public.anime_content for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins can update content" on public.anime_content;
create policy "Admins can update content"
  on public.anime_content for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can delete content" on public.anime_content;
create policy "Admins can delete content"
  on public.anime_content for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Published episodes are visible to everyone" on public.anime_episodes;
create policy "Published episodes are visible to everyone"
  on public.anime_episodes for select
  using (
    (published and exists (
      select 1 from public.anime_content
      where id = content_id and published
    ))
    or (select private.is_admin())
  );

drop policy if exists "Admins can insert episodes" on public.anime_episodes;
create policy "Admins can insert episodes"
  on public.anime_episodes for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins can update episodes" on public.anime_episodes;
create policy "Admins can update episodes"
  on public.anime_episodes for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can delete episodes" on public.anime_episodes;
create policy "Admins can delete episodes"
  on public.anime_episodes for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Published articles are visible to everyone" on public.articles;
create policy "Published articles are visible to everyone"
  on public.articles for select
  to anon, authenticated
  using (published or (select private.is_admin()));

drop policy if exists "Admins can view articles" on public.articles;
create policy "Admins can view articles"
  on public.articles for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins can insert articles" on public.articles;
create policy "Admins can insert articles"
  on public.articles for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins can update articles" on public.articles;
create policy "Admins can update articles"
  on public.articles for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can delete articles" on public.articles;
create policy "Admins can delete articles"
  on public.articles for delete
  to authenticated
  using ((select private.is_admin()));
