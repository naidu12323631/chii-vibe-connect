-- Stream live changes to the plans feed. Paste into the SQL Editor → Run.
-- Lets clients receive INSERT/UPDATE/DELETE on plans + participants in realtime
-- (the app subscribes via supabase.channel(...).on("postgres_changes", ...)).
alter publication supabase_realtime add table public.plans;
alter publication supabase_realtime add table public.plan_participants;
