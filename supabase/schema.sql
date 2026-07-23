-- Life Reset — cloud sync schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
--
-- Design: one row per signed-in user, holding the entire app state as a single
-- jsonb blob. This matches the app's existing zustand shape (UserProfile) with
-- no separate migration needed on the client whenever that shape changes —
-- new fields just appear in the blob. Row Level Security ensures a user can
-- only ever read or write their own row.

create table if not exists public.life_reset_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.life_reset_profiles enable row level security;

drop policy if exists "select_own_profile" on public.life_reset_profiles;
create policy "select_own_profile"
  on public.life_reset_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "insert_own_profile" on public.life_reset_profiles;
create policy "insert_own_profile"
  on public.life_reset_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "update_own_profile" on public.life_reset_profiles;
create policy "update_own_profile"
  on public.life_reset_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy on purpose — deleting the auth.users row cascades and
-- removes the profile row automatically; nothing else should be able to.
