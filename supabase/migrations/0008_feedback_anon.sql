-- Allow anonymous feedback (e.g. from unauthenticated video-chat users).
-- user_id becomes optional: anonymous rows store a NULL user_id. A partial
-- unique index still enforces one submission per authenticated user.
-- Run after 0006_feedback.sql.

alter table public.feedback alter column user_id drop not null;

alter table public.feedback drop constraint if exists feedback_user_unique;
create unique index if not exists feedback_user_unique
  on public.feedback (user_id) where user_id is not null;

-- Authenticated users insert rows for themselves (or anonymously with NULL).
drop policy if exists "feedback_insert" on public.feedback;
create policy "feedback_insert" on public.feedback for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Anonymous (signed-out) users may only insert rows with a NULL user_id.
drop policy if exists "feedback_insert_anon" on public.feedback;
create policy "feedback_insert_anon" on public.feedback for insert to anon
  with check (user_id is null);