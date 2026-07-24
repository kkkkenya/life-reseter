# RESET — your own behavior-tracking system

A personal, no-theater habit and life-tracking app. No paywall, no forced account, no
onboarding quiz — you open it, pick your tasks, and start tracking. Runs entirely in your
browser, data saved to your device via localStorage, with optional Supabase cloud sync so
the same data follows you across devices.

## Setup

```bash
npm install
cp .env.example .env   # optional — only needed for Gemini features
npm run dev
```

Open the printed URL. To use it on your phone, open the same URL on your phone's browser
while on the same network (use the "Network" URL vite prints), or deploy it (see below) and
"Add to Home Screen" for a real app icon with offline support.

## Gemini AI features (optional)

This enables:
- A short reflection tying the daily Gospel verse to your day
- End-of-day AI review of what you did/skipped
- Weekly blunt report card (with a copy-to-share button)
- A follow-up reflection after journaling
- Your 2 daily quests (income / friendship / exposure), tailored to your year income goal

Without it configured, everything above still works — quests fall back to a curated offline
pool instead of Gemini-generated ones, and the other cards just show a "not configured" message.

**The key is server-side only** — the app calls `/api/gemini` (a Vercel serverless function
in `api/gemini.ts`), which is the only place that ever reads the real key. It never ships to
the browser, unlike an earlier version of this app which put the key straight in the client
bundle (fine for a private local build, but a real problem once deployed publicly — anyone
inspecting the live site could read it straight out of the JS).

**1. Get a free key** at https://aistudio.google.com/apikey.

**2. Set these two env vars:**
```bash
GEMINI_API_KEY=your_key_here        # server-only — no VITE_ prefix, never exposed
VITE_GEMINI_ENABLED=true            # non-secret flag telling the UI Gemini is on
```
Locally: put both in `.env`. On Vercel: Project Settings → Environment Variables — add both
there too (see Deploy section below).

**3. Local dev needs `vercel dev`, not `npm run dev`, for AI features to work.**
`npm run dev` (plain Vite) doesn't run the `/api` serverless function, so Gemini calls will
fail locally under it — the app just falls back to offline content, nothing breaks, but you
won't see real Gemini output. To test it locally:
```bash
npm install -g vercel   # once
vercel dev
```
This runs the static site AND `api/gemini.ts` together, exactly like production.

**Model:** defaults to `gemini-3.1-flash-lite` (`gemini-2.0-flash`, the old default, was
retired by Google on March 31, 2026). Override with `GEMINI_MODEL` (server-side, same rule —
no `VITE_` prefix) if you want something else — e.g. `gemini-3.1-pro-preview` for noticeably
better quality on the weekly report, at the cost of being slower and not free-tier eligible.

## Cloud sync across devices (Supabase, optional)

Without this set up, the app works exactly as it always has — local-only, one device. Set
it up once and your progress follows you to any device you sign into.

**1. Create a Supabase project**
Go to https://supabase.com → New project (free tier is enough). Wait for it to finish
provisioning.

**2. Create the sync table**
Dashboard → SQL Editor → New query → paste the contents of `supabase/schema.sql` from this
repo → Run. This creates one table (`life_reset_profiles`) holding your whole app state as
a single JSON blob per user, with Row Level Security so only you can read or write your own
row.

**3. Confirm email auth is on**
Dashboard → Authentication → Providers → Email should already be enabled by default. This
app signs you in with a passwordless magic link (no password to manage or lose).

**4. Get your API keys**
Dashboard → Project Settings → API Keys. There are two you'll see, and this step is where
it's easy to grab the wrong one:
- **Publishable key** (`sb_publishable_...`) — safe for the browser, this is the one you want.
- **Secret key** (`sb_secret_...`) — full access, bypasses Row Level Security entirely.
  Supabase actively blocks this one from working in a browser (you'll get "Forbidden use of
  secret API key in browser" if you paste it in by mistake) — never put this in `.env` or
  anywhere client-side.

(Older projects may instead show a legacy **anon / public** key and **service_role** key —
same rule applies: anon/public is the one to use, service_role is the one to never expose.)

Copy the **Project URL** and the **Publishable** (or legacy **anon**) key.

**5. Add them to your `.env`**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key_here
```
Restart `npm run dev` after saving.

**6. Sign in**
Open the app — you'll now see a "Sign in to sync" screen first. Enter your email, check
your inbox, click the link. You're in, on that device.

**7. If you deploy the app (Vercel etc.)**
Add the same two env vars in your host's environment variable settings, **and** add your
deployed URL to Dashboard → Authentication → URL Configuration → Redirect URLs — otherwise
the magic link will redirect back to `localhost` instead of your live site.

**8. Repeat sign-in on your other device**
Same email, same magic-link flow. First sign-in on a fresh device pulls down whatever's
already saved in the cloud.

**How the sync actually works:** every change you make (completing a task, journaling,
logging income, etc.) is debounced ~1.5s then pushed up as one JSON blob. On sign-in, if a
cloud copy already exists, it replaces what's on that device — the assumption is you're
picking up where you left off elsewhere. This is last-write-wins, not real-time
collaborative merging: if you go offline and edit the same day on two devices before either
syncs, whichever syncs last overwrites the other. Fine for one person, two devices, normal
use — not built for simultaneous multi-device editing.

**On the publishable key being in the client bundle:** that's expected and safe — it's
*meant* to be public; Row Level Security (from `schema.sql`) is what actually protects your
data, by only allowing a row to be read/written by its own `auth.uid()`. Never put the
**secret** (or legacy `service_role`) key in client code — that one bypasses RLS entirely,
and Supabase will reject it outright if it ever does end up in a browser request.

### Troubleshooting: magic link opens Supabase's page instead of the app

If clicking the email link lands you on a generic Supabase confirmation page (or "site
can't be reached") instead of back in the app, check these in order:

1. **Redirect URL must match exactly, with the wildcard.** Dashboard → Authentication →
   URL Configuration → Redirect URLs. It needs the *exact* origin you're testing from, plus
   `/**` at the end — e.g. `http://localhost:5173/**` for local dev (check your terminal for
   the actual port Vite printed) or `https://your-app.vercel.app/**` once deployed. Missing
   the `/**`, a wrong port, or `http` vs `https` mismatch will all cause this.
2. **Site URL** (same page, above Redirect URLs) should also be set to whichever URL you use
   most — this is the default/fallback Supabase uses.
3. **Same browser, same device.** The sign-in flow needs to complete in the same browser
   session it started in (it stores a piece of the exchange locally to verify the link).
   Opening the email on your phone while `npm run dev` runs on your laptop won't work —
   `localhost` isn't reachable from another device at all. Test on one device until deployed.
4. **Dev server must actually be running** when you click the link, if testing against
   `localhost`.

## Streak reminders — push notifications (optional)

A "Don't lose your streak" push notification, sent only if today's tasks are still open by
whatever time you pick. Requires cloud sync (above) to already be set up — the reminder job
runs on a server, and Supabase is how it knows who you are and whether you've finished today.

**1. Generate a VAPID keypair** (identifies your server to the push services — one-time, free)
```bash
npx web-push generate-vapid-keys
```
Keep both values from the output; you'll paste them into env vars in a moment.

**2. Re-run the schema**
Dashboard → SQL Editor → New query → paste `supabase/schema.sql` again → Run. It's safe to
re-run over your existing setup — it only adds the new `push_subscriptions` table, everything
else uses `if not exists` / `drop policy if exists` so nothing already there is touched.

**3. Get your Supabase service role key**
Dashboard → Project Settings → API Keys → **Secret key** (`sb_secret_...`, or legacy
**service_role**). This is the key `schema.sql`'s cloud-sync section warned you to never use —
the one exception is here, server-side only, in the reminder job itself, which needs to check
every subscribed user rather than just one signed-in session.

**4. Add env vars to your deploy** (Vercel → Project → Settings → Environment Variables)
```bash
VITE_VAPID_PUBLIC_KEY=the_public_key_from_step_1     # safe in the browser bundle
VAPID_PRIVATE_KEY=the_private_key_from_step_1        # server-only, never VITE_-prefixed
VAPID_SUBJECT=mailto:you@example.com                 # required by the push spec, just an identifier
SUPABASE_SERVICE_ROLE_KEY=the_secret_key_from_step_3 # server-only
CRON_SECRET=make_up_any_long_random_string           # shared secret between GitHub and this endpoint
```
Add `VITE_VAPID_PUBLIC_KEY` to your local `.env` too (see `.env.example`) so it's picked up
in dev builds.

**5. Wire up the hourly check**
Vercel's own Cron Jobs feature is capped at once-per-day on the free Hobby plan, which can't
hit each subscriber's own local reminder hour — so this repo includes a GitHub Actions
workflow (`.github/workflows/streak-reminders.yml`) that pings the check every hour instead,
free on GitHub at this frequency. In your GitHub repo:
- Settings → Secrets and variables → Actions → **New repository secret** → name `CRON_SECRET`,
  value: the same string you used in step 4.
- Same page, **Variables** tab → **New repository variable** → name `APP_DOMAIN`, value: your
  deployed domain with no `https://` (e.g. `life-reset.vercel.app`).

(If you're on Vercel Pro instead, you can use its built-in cron at any frequency — add a
`vercel.json` with a `crons` entry pointing at `/api/send-streak-reminders` on whatever
schedule you like, and skip the GitHub Actions workflow entirely.)

**6. Test it**
GitHub repo → Actions tab → "Streak reminders" workflow → **Run workflow** (the manual
`workflow_dispatch` trigger) → check the run log for a JSON response like
`{"checked":1,"sent":0,"skipped":1,"removed":0}`. `sent: 0` is expected unless the current
hour happens to match a subscriber's reminder hour.

**7. Turn it on as a user**
Life → Settings → **Streak reminders** → toggle on → pick a time → allow notifications when
the browser asks. Two real-world caveats:
- The service worker only registers on a production build (`npm run build` / your deployed
  site), not `npm run dev` — test this on the deployed URL, not locally.
- **iPhone/iPad:** Safari only delivers push notifications to a PWA added to the Home Screen
  (Share → Add to Home Screen), not to a regular Safari tab, as of iOS 16.4+. Desktop and
  Android Chrome/Firefox/Edge work in a normal browser tab, no install needed.

## What's inside

- **Setup** — pick your tasks and a start date. That's it. No quiz, no vow, no fake science.
- **Today** — daily tasks (grouped by time of day, sorted by priority), a Most Important
  Task spotlight, list / time-blocked schedule / calendar grid views, skip-with-reason,
  incomplete tasks auto-carry into today from yesterday, streak glance strip, Sunday
  weekly-focus prompt, the daily Gospel verse (KJV, Jesus's words only, rotates daily),
  your 2 daily quests, and an AI daily review. The day counter has no cap — it's a lifetime
  odometer, not a fixed program length.
- **Adding a task** — set frequency as weekly, biweekly, or monthly (specific day of
  month), a priority (P1/P2/P3), and a time-of-day bucket.
- **Streaks** — avoidance streaks (sobriety, no PMO, etc.) with a live clock, relapse
  logging with pattern insights, and milestone badges. Also supports *positive* streaks
  linked to a task (e.g. daily Rosary) — the streak auto-computes from consecutive
  completions, no manual reset needed.
- **Life** — four sub-tabs:
  - *Overview*: behavior-derived stats (computed from what you actually complete, not a
    quiz), a Consistency section (perfect-day streak, a habit heatmap, correlation
    insights like "you do X more often on days you also do Y"), your 7 life areas by XP,
    mood-vs-completion correlation, milestones, and the weekly AI report.
  - *Journal*: morning energy + gratitude check-in, evening reflection (your 4 prompts),
    an optional Ignatian examen, and an AI reflection on request.
  - *Finances*: income + expenses with a real net number, budget categories with monthly
    caps, and your income-range goal.
  - *Goals*: daily/weekly/monthly/6-month/yearly objectives per life area — mark one
    achieved and it lands in your milestone tracker.
- **Tools** — Pomodoro clock, guided breathing, workout logger, sleep log, venture
  time-split tracker, screen-time check-in.
- **Season** — a personal XP rank ladder (Bronze → Diamond) on a 24-day cycle.

## Deploy to Vercel (full guide)

**Option A — connect your GitHub repo (recommended: auto-redeploys on every push)**

1. Push this project to a GitHub repo if it isn't already:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to https://vercel.com → sign in (GitHub login is easiest) → **Add New… → Project**.
3. Select your repo → Vercel auto-detects Vite (Framework Preset: Vite). Leave build command
   (`npm run build` / `vite build`) and output directory (`dist`) as detected — no changes
   needed.
4. Before clicking Deploy, expand **Environment Variables** and add whichever of these you
   use:
   - `GEMINI_API_KEY` (server-only, no prefix) + `VITE_GEMINI_ENABLED=true` (and
     `GEMINI_MODEL` if overriding the default)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` — the **publishable** key, never the secret key (see above)
5. Click **Deploy**. You'll get a `*.vercel.app` URL in ~1 minute.
6. **If you're using Supabase auth:** copy that `.vercel.app` URL, then in your Supabase
   dashboard go to Authentication → URL Configuration → Redirect URLs and add it (e.g.
   `https://your-app.vercel.app/**`). Without this step the magic-link email will redirect
   back to `localhost` instead of your live site.
7. Every future `git push` to `main` auto-redeploys. Pull requests get their own preview URL.

**Option B — deploy without GitHub, straight from your machine**
```bash
npm install -g vercel
vercel login
vercel        # first run: answer its setup prompts, deploys a preview
vercel --prod # promotes to your production URL
```
It'll ask for the same env vars on first run (or add them after via
`vercel env add VITE_SUPABASE_URL production`, etc.). Re-run `vercel --prod` after changes —
there's no auto-redeploy without a connected git repo.

**Custom domain:** Project → Settings → Domains → add your domain (works with Porkbun/Truehost
— point the domain's DNS at Vercel's nameservers or add the CNAME/A record Vercel shows you).
If you add a custom domain and use Supabase auth, add that domain to the Supabase redirect
URL list too (step 6 above), alongside the `.vercel.app` one — keep both, don't replace it.

## Data & backup

Everything lives in `localStorage` under `life-reset-storage` on this device, always — that
copy still exists whether or not you've set up Supabase, and is what you get if you're not
signed in. To back up manually:

```js
copy(localStorage.getItem("life-reset-storage"))
```

If you've set up cloud sync (see above), the same data also lives in your
`life_reset_profiles` table in Supabase, one row per signed-in user — that's your
cross-device copy and a second backup independent of the browser.

## Reset

Small "Reset" button top-right of the main app wipes everything and takes you back to Setup.
