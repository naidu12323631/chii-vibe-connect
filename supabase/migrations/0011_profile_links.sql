-- Profile links & settings: a real username, home location, social links and a
-- visibility setting. Paste into the Supabase Dashboard → SQL Editor → Run.

alter table public.profiles
  add column if not exists username   text,
  add column if not exists location   text,
  add column if not exists instagram  text,
  add column if not exists website    text,
  add column if not exists visibility text not null default 'public';

-- Handles are lower-case, 3–20 chars, letters/numbers/dot/underscore.
do $$ begin
  alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9._]{3,20}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_visibility_check
    check (visibility in ('public', 'followers', 'private'));
exception when duplicate_object then null; end $$;

-- One handle per person, case-insensitively. NULLs don't collide.
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username is not null;

-- =====================================================================
-- Username availability.
-- security definer so the check still works for handles held by profiles
-- the caller can't read under the visibility policy below.
-- =====================================================================
create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(candidate))
      and id <> auth.uid()
  );
$$;

grant execute on function public.username_available(text) to authenticated;

-- =====================================================================
-- Reads now respect the visibility setting. Everything defaults to
-- 'public', so existing profiles behave exactly as before.
--   public    — any signed-in user
--   followers — only people who follow you (plus you)
--   private   — only you
-- Hidden profiles simply render as "Someone" wherever names are shown.
-- =====================================================================
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated
  using (
    visibility = 'public'
    or id = auth.uid()
    or (
      visibility = 'followers'
      and exists (
        select 1 from public.follows f
        where f.following_id = profiles.id and f.follower_id = auth.uid()
      )
    )
  );
