-- Likes on photo posts, so the heart counts on the profile grid are real.
-- Paste into the Supabase Dashboard → SQL Editor → Run (after 0003_social_profile.sql).

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);

alter table public.post_likes enable row level security;

drop policy if exists "post_likes_read"   on public.post_likes;
drop policy if exists "post_likes_insert" on public.post_likes;
drop policy if exists "post_likes_delete" on public.post_likes;

-- Anyone signed in can read (to count them); you can only add/remove your own like.
create policy "post_likes_read"   on public.post_likes for select to authenticated using (true);
create policy "post_likes_insert" on public.post_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "post_likes_delete" on public.post_likes for delete to authenticated
  using (auth.uid() = user_id);
