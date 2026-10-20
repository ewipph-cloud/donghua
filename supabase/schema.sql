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
  featured boolean not null default false,
  published boolean not null default false,
  views bigint not null default 0 check (views >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anime_content
  add column if not exists stream_url_okru text,
  add column if not exists stream_url_dailymotion text;

create index if not exists anime_content_published_updated_idx
  on public.anime_content (published, updated_at desc);
create index if not exists anime_content_genre_idx
  on public.anime_content (genre);

create table if not exists public.anime_episodes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.anime_content (id) on delete cascade,
  episode_number integer not null check (episode_number >= 0),
  title text not null default '',
  stream_url text,
  stream_url_okru text,
  stream_url_dailymotion text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, episode_number)
);

alter table public.anime_episodes
  add column if not exists stream_url_okru text,
  add column if not exists stream_url_dailymotion text;

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

alter table public.anime_content enable row level security;
alter table public.anime_episodes enable row level security;

revoke all on public.admin_users, public.anime_content, public.anime_episodes from public;
revoke all on public.admin_users, public.anime_content, public.anime_episodes from anon, authenticated;
grant select on public.anime_content, public.anime_episodes to anon, authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.anime_content, public.anime_episodes to authenticated;
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
