-- Separate table for the stranger video-chat text messages.
-- Paste into the Supabase Dashboard → SQL Editor → Run (after 0001_init.sql).
--
-- Video chat is open to everyone (authenticated AND anonymous visitors), so the
-- RLS policies below intentionally grant the `anon` role insert/select. There is
-- no user_id FK — participants are identified only by a random client id.

create table if not exists public.video_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  room       text not null,        -- the pair channel name (video-pair-<a>-<b>)
  sender_id  text not null,        -- the sender's random client id (myId)
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists video_chat_messages_room_idx
  on public.video_chat_messages (room, created_at);

alter table public.video_chat_messages enable row level security;

-- Anonymous stranger chat: anyone (anon or signed in) may post and read.
drop policy if exists "video_chat_insert" on public.video_chat_messages;
drop policy if exists "video_chat_read"   on public.video_chat_messages;
create policy "video_chat_insert" on public.video_chat_messages
  for insert to anon, authenticated with check (true);
create policy "video_chat_read" on public.video_chat_messages
  for select to anon, authenticated using (true);
