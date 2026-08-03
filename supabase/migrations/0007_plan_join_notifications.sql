-- Notifications: notify a plan's creator + other members when someone joins.
--
-- A trigger on plan_participants INSERTS one notification row per recipient
-- (creator and every existing participant, excluding the joiner) whenever a new
-- participant joins. RLS scopes reads to the recipient, so Realtime only
-- delivers each user their own rows — the app shows the toast + bell entry.
--
-- Paste this file into the Supabase Dashboard → SQL Editor → Run.

-- ----------------------------------------------------------- notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null default 'plan_join',
  actor_id   uuid references auth.users (id) on delete set null,
  actor_name text,
  plan_id    uuid references public.plans (id) on delete cascade,
  plan_title text,
  content    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- --------------------------------------- trigger: notify on plan join/leave
create or replace function public.notify_plan_join()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_name text;
  creator_id uuid;
  plan_title text;
  r record;
begin
  select user_id, title into creator_id, plan_title
    from public.plans where id = new.plan_id;

  select coalesce(display_name, 'Someone') into actor_name
    from public.profiles where id = new.user_id;

  -- Notify the plan creator (never the joiner).
  if creator_id is not null and creator_id <> new.user_id then
    insert into public.notifications
      (user_id, type, actor_id, actor_name, plan_id, plan_title, content)
    values
      (creator_id, 'plan_join', new.user_id, actor_name, new.plan_id, plan_title,
       actor_name || ' joined your plan');
  end if;

  -- Notify the other participants (excluding the joiner and the creator).
  for r in
    select pp.user_id
      from public.plan_participants pp
     where pp.plan_id = new.plan_id
       and pp.user_id <> new.user_id
       and pp.user_id <> creator_id
  loop
    insert into public.notifications
      (user_id, type, actor_id, actor_name, plan_id, plan_title, content)
    values
      (r.user_id, 'plan_join', new.user_id, actor_name, new.plan_id, plan_title,
       actor_name || ' joined the plan');
  end loop;

  return new;
end;
$$;

drop trigger if exists plan_join_notify on public.plan_participants;
create trigger plan_join_notify
  after insert on public.plan_participants
  for each row execute function public.notify_plan_join();

-- =====================================================================
-- Row Level Security: users can read/manage only their own notifications.
-- Rows are written by the security-definer trigger, so no insert policy is
-- needed by clients.
-- =====================================================================
alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;

create policy "notifications_select" on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "notifications_update" on public.notifications for update to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- Realtime: deliver INSERTs on notifications to subscribed clients.
-- =====================================================================
alter publication supabase_realtime add table public.notifications;