-- Life Reset — journal media backup (Supabase Storage).
-- Run this once in your Supabase project AFTER supabase/schema.sql:
-- Dashboard → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Design: one PRIVATE bucket. Each file lives at "<auth.uid()>/<mediaId>"
-- (e.g. "a1b2c3.../photo-169...-x7q2"). Storage RLS policies scope every
-- operation to the caller's own folder, so users can never see, overwrite,
-- or delete each other's journal photos or voice notes. The bucket is NOT
-- public — all reads go through the signed-in client (anon key + RLS).

insert into storage.buckets (id, name, public)
values ('journal-media', 'journal-media', false)
on conflict (id) do nothing;

drop policy if exists "upload_own_journal_media" on storage.objects;
create policy "upload_own_journal_media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "read_own_journal_media" on storage.objects;
create policy "read_own_journal_media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "update_own_journal_media" on storage.objects;
create policy "update_own_journal_media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete_own_journal_media" on storage.objects;
create policy "delete_own_journal_media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
