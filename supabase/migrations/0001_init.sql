-- chillout schema for Supabase (Postgres).
-- Paste this whole file into the Supabase Dashboard → SQL Editor → Run.
-- Auth is handled by Supabase Auth (auth.users); the tables below hold app data
-- and are protected by Row Level Security (RLS).

-- ------------------------------------------------------------------ profiles
-- One row per auth user. Created automatically by the trigger below on signup.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  bio          text,
  interests    jsonb not null default '[]'::jsonb,
  availability jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- --------------------------------------------------------------------- plans
create table if not exists public.plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  description      text,
  location         text,
  plan_time        timestamptz,
  max_participants int not null default 4,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists plans_created_idx on public.plans (created_at desc);

-- -------------------------------------------------------- plan_participants
create table if not exists public.plan_participants (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (plan_id, user_id)
);
create index if not exists plan_participants_plan_idx on public.plan_participants (plan_id);

-- ------------------------------------------------------------- plan_messages
create table if not exists public.plan_messages (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists plan_messages_plan_created_idx on public.plan_messages (plan_id, created_at);

-- --------------------------------------------------------- push_subscriptions
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- display_name is read from the signup metadata, falling back to the
-- part of the email before the "@".
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Helper: is the current user a member of (or the owner of) a plan?
-- security definer so it can read plan_participants without tripping RLS
-- recursion in the policies below.
-- =====================================================================
create or replace function public.is_plan_member(p_plan_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.plans where id = p_plan_id and user_id = p_user_id
    union
    select 1 from public.plan_participants where plan_id = p_plan_id and user_id = p_user_id
  );
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.plans               enable row level security;
alter table public.plan_participants   enable row level security;
alter table public.plan_messages       enable row level security;
alter table public.push_subscriptions  enable row level security;

-- profiles: anyone signed in can read; you can only write your own.
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- plans: anyone signed in can read; only the owner can create/edit/delete.
drop policy if exists "plans_read"   on public.plans;
drop policy if exists "plans_insert" on public.plans;
drop policy if exists "plans_update" on public.plans;
drop policy if exists "plans_delete" on public.plans;
create policy "plans_read"   on public.plans for select to authenticated using (true);
create policy "plans_insert" on public.plans for insert to authenticated with check (auth.uid() = user_id);
create policy "plans_update" on public.plans for update to authenticated using (auth.uid() = user_id);
create policy "plans_delete" on public.plans for delete to authenticated using (auth.uid() = user_id);

-- plan_participants: anyone signed in can read; you can only add/remove yourself.
drop policy if exists "participants_read"   on public.plan_participants;
drop policy if exists "participants_insert" on public.plan_participants;
drop policy if exists "participants_delete" on public.plan_participants;
create policy "participants_read"   on public.plan_participants for select to authenticated using (true);
create policy "participants_insert" on public.plan_participants for insert to authenticated with check (auth.uid() = user_id);
create policy "participants_delete" on public.plan_participants for delete to authenticated using (auth.uid() = user_id);

-- plan_messages: only members of the plan can read; members can post as themselves.
drop policy if exists "messages_read"   on public.plan_messages;
drop policy if exists "messages_insert" on public.plan_messages;
create policy "messages_read"   on public.plan_messages for select to authenticated
  using (public.is_plan_member(plan_id, auth.uid()));
create policy "messages_insert" on public.plan_messages for insert to authenticated
  with check (auth.uid() = user_id and public.is_plan_member(plan_id, auth.uid()));

-- push_subscriptions: you can only see/manage your own.
drop policy if exists "push_all" on public.push_subscriptions;
create policy "push_all" on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Realtime: broadcast INSERTs on plan_messages to subscribed clients.
-- =====================================================================
alter publication supabase_realtime add table public.plan_messages;
