-- Instagram-style profile: photo posts + follow system + image storage.
-- Paste into the Supabase Dashboard → SQL Editor → Run (after 0001_init.sql).

-- ------------------------------------------------------------------- posts
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  image_url  text not null,
  caption    text,
  created_at timestamptz not null default now()
);
create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);

alter table public.posts enable row level security;
drop policy if exists "posts_read"   on public.posts;
drop policy if exists "posts_insert" on public.posts;
drop policy if exists "posts_delete" on public.posts;
-- Anyone signed in can view posts; you can only create/delete your own.
create policy "posts_read"   on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts_delete" on public.posts for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------- follows
create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
drop policy if exists "follows_read"   on public.follows;
drop policy if exists "follows_insert" on public.follows;
drop policy if exists "follows_delete" on public.follows;
-- Anyone signed in can read (to compute counts); you can only add/remove your own follows.
create policy "follows_read"   on public.follows for select to authenticated using (true);
create policy "follows_insert" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete to authenticated using (auth.uid() = follower_id);

-- =====================================================================
-- Storage: public buckets for avatars and post photos.
-- Files are stored under a per-user folder: "<user_id>/<filename>".
-- =====================================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('posts', 'posts', true)
  on conflict (id) do nothing;

-- Public read for both buckets.
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('avatars', 'posts'));

-- Signed-in users can upload/update/delete only within their own <user_id>/ folder.
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;
create policy "media_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
