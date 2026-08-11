-- Plan covers: an optional cover image on a plan, plus a public bucket to hold
-- uploaded ones. Paste into the Supabase Dashboard → SQL Editor → Run.
--
-- cover_url holds either an uploaded image URL, or "preset:<vibe>" for one of
-- the built-in gradient covers (no file needed).

alter table public.plans add column if not exists cover_url text;

-- ------------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
  on conflict (id) do nothing;

-- Re-declare the shared media policies with 'covers' included alongside the
-- existing avatars/posts buckets (see 0003_social_profile.sql).
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('avatars', 'posts', 'covers'));

drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;

-- Writers may only touch files under a folder named after their own user id.
create policy "media_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'posts', 'covers') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'posts', 'covers') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'posts', 'covers') and (storage.foldername(name))[1] = auth.uid()::text);
