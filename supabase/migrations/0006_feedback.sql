-- Feedback collection.
-- Paste this file into the Supabase Dashboard → SQL Editor → Run.
-- Each authenticated user may submit feedback once (unique user_id); the app
-- stops prompting for feedback once a row exists for the user.

-- ------------------------------------------------------------------ feedback
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  -- One submission per user so we know when to stop prompting.
  constraint feedback_user_unique unique (user_id)
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

-- =====================================================================
-- Row Level Security: signed-in users can read their own feedback and
-- create a row for themselves.
-- =====================================================================
alter table public.feedback enable row level security;

drop policy if exists "feedback_read"   on public.feedback;
drop policy if exists "feedback_insert" on public.feedback;

create policy "feedback_select" on public.feedback for select to authenticated
  using (auth.uid() = user_id);
create policy "feedback_insert" on public.feedback for insert to authenticated
  with check (auth.uid() = user_id);