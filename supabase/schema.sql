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
<<<<<<< HEAD

-- ---- Streak reminders (push notifications) ----
-- One row per subscribed browser. The cron job (api/send-streak-reminders.ts)
-- reads across ALL rows using the Supabase service role key, which bypasses
-- RLS by design — that's the one place in this app that key is used, and it
-- must never be exposed to the browser (no VITE_ prefix, server-only).

create table if not exists public.push_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',       -- IANA name, e.g. "Africa/Nairobi"
  reminder_hour smallint not null default 20, -- 0-23, local hour to send the nudge
  last_sent_date date,                        -- local date (per `timezone`) the last reminder went out, to avoid duplicates
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- The user's own browser manages its own row directly (subscribe/change time/unsubscribe).
-- The cron job's server-side reads/updates use the service role key and skip RLS entirely.
drop policy if exists "select_own_subscription" on public.push_subscriptions;
create policy "select_own_subscription"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "upsert_own_subscription" on public.push_subscriptions;
create policy "upsert_own_subscription"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "update_own_subscription" on public.push_subscriptions;
create policy "update_own_subscription"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete_own_subscription" on public.push_subscriptions;
create policy "delete_own_subscription"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
