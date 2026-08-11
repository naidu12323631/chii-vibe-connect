-- One-to-one messages between any two people. Pairing happens at random from
-- whoever is online, so there is deliberately no follow requirement.
-- Paste into the Supabase Dashboard → SQL Editor → Run.

create table if not exists public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  content      text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

-- A thread reads both directions at once, so index each ordering.
create index if not exists direct_messages_pair_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists direct_messages_pair_rev_idx
  on public.direct_messages (recipient_id, sender_id, created_at);

grant select, insert, delete on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;

alter table public.direct_messages enable row level security;

drop policy if exists "dm_read"   on public.direct_messages;
drop policy if exists "dm_insert" on public.direct_messages;
drop policy if exists "dm_delete" on public.direct_messages;

-- Only the two people in the thread can read it.
create policy "dm_read" on public.direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Any signed-in person can message any other. Pairing is random rather than
-- browsable, so there's no relationship to check — you just can't forge a
-- message as somebody else.
create policy "dm_insert" on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id);

create policy "dm_delete" on public.direct_messages for delete to authenticated
  using (auth.uid() = sender_id);

-- Superseded: an earlier draft gated sending on a follow edge. Dropped so a
-- re-run of this file leaves nothing behind.
drop function if exists public.can_direct_message(uuid, uuid);

-- Live delivery, matching plan_messages.
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null; end $$;

alter table public.direct_messages replica identity full;
