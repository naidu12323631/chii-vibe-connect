-- Plan extras: Google Maps link + host can remove participants.
-- Paste into the Supabase Dashboard → SQL Editor → Run.

-- Optional Google Maps link on a plan.
alter table public.plans add column if not exists maps_url text;

-- Let the plan HOST remove participants (previously only self-removal was allowed).
drop policy if exists "participants_delete" on public.plan_participants;
create policy "participants_delete" on public.plan_participants for delete to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.plans p where p.id = plan_id)
  );
