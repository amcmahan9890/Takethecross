# Take the Cross

Read the Bible in a year together, one episode a day with Fr. Mike Schmitz.
Live site: **https://www.takethecross.app** (the canonical address used everywhere in the project).

Stack: static website on **Vercel** + **Supabase** (accounts, database, live leaderboard) + code in **GitHub**.

---

## What's in this repository

| File | What it does |
|---|---|
| `index.html`, `styles.css`, `theme.js` | The page, its design, and the theme/text-size preference |
| `app.js` | All app screens and logic (Today, Fellowship, Prayer, Armory, quiz, streaks, avatars, admin) |
| `backend.js` | Every call to Supabase and to the optional `/api/ai` service. Nothing else talks to the database |
| `api/ai.js` | **Optional** serverless function for the daily study guide and reflection feedback. Off until you add keys |
| `schema.sql` | The whole database: tables, security rules, server functions. Paste into Supabase once |
| `team-update.sql` | Adds only the team-totals function (for projects that already ran `schema.sql`). Safe to run again |
| `bible-plan.js` | The official 365-day reading plan and where each day's readings take place (powers the map). Generated data |
| `build.mjs`, `package.json`, `vercel.json` | Build + deploy settings. `build.mjs` writes the public Supabase settings from Vercel's environment variables |
| `manifest.webmanifest`, `favicon.svg`, `icon-*.png`, `apple-touch-icon.png` | Home-screen install + icons |
| `.env.example` | The environment variable names (never put real values in GitHub) |

If a `SUPABASE_URL` / `SUPABASE_ANON_KEY` is missing, the site still works in **local-only mode** (progress saved on each device), so you can deploy this before Supabase is finished.

---

## One-time setup (works from a phone)

### 1. GitHub + Vercel (already connected)
Your repository is connected to Vercel, so every commit to the main branch deploys automatically.
1. Unzip the project on your phone (Files app: tap the zip).
2. In your repository on github.com -> **Add file -> Upload files**. Select every file from the unzipped folder **except the `api` folder** and commit. Same-named files are replaced.
3. In the same commit session or right after, **Add file -> Create new file**, name it `api/ai.js` (typing the `/` makes the folder), paste the contents of `api/ai.js`, and commit. `vercel.json` expects this file, so add it straight away. It does nothing until you add AI keys.
4. Vercel deploys. Until step 4 below is finished the site runs in local-only mode (progress saved on each device), so nothing breaks while you set up Supabase.

**Domains:** both `takethecross.app` and `www.takethecross.app` are attached to the Vercel project. `www.takethecross.app` is the canonical address. `vercel.json` redirects the bare domain to `www`. In Vercel -> Settings -> Domains, make sure `www.takethecross.app` is **not** set to redirect back to the bare domain (that would loop). Leave `www` as the primary domain.

### 2. Supabase
1. supabase.com -> **New project**. Save the database password. Pick a region near your users.
2. Left menu -> **SQL Editor -> New query**. Paste the entire `schema.sql` and tap **Run**. You should see "Success".
3. **Project Settings -> API Keys** (or "API"). Copy:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **Publishable key** (starts with `sb_publishable_`). If you only see a legacy **anon** key, that works too.
   - Never use the **secret** or **service_role** key anywhere in this project.
4. **Authentication -> URL Configuration**: set **Site URL** to `https://www.takethecross.app` (include `www`) and add `https://www.takethecross.app/**` and `https://takethecross.app/**` under **Redirect URLs**.

### 3. Email sending (required, or only you can sign in)
Supabase's built-in email only delivers to your own team and is limited to 2 emails an hour. To let friends and family sign in you need a free email sender. Resend works well:
1. resend.com -> sign up -> **Domains -> Add domain** `takethecross.app`. Add the DNS records it shows in Porkbun (Domain Management -> DNS). Wait until it says **Verified**.
2. Resend -> **API Keys -> Create API key**. Copy it.
3. Supabase -> **Authentication -> Emails -> SMTP Settings** -> turn on **Enable custom SMTP**:
   - Sender email: `login@takethecross.app`  - Sender name: `Take the Cross`
   - Host `smtp.resend.com`  - Port `465`  - Username `resend`  - Password: the Resend API key
4. Supabase -> **Authentication -> Emails -> Templates**. Edit **both** the **Magic link** and **Confirm sign up** templates so the message body contains the code. Example body:
   ```html
   <h2>Your Take the Cross code</h2>
   <p>Enter this code in the app:</p>
   <h1>{{ .Token }}</h1>
   <p>It expires soon. If you didn't ask for it, you can ignore this email.</p>
   ```
5. Optional: **Authentication -> Rate Limits** to raise the emails-per-hour limit as your group grows.

### 4. Vercel
1. Vercel -> your project -> **Settings -> Environment Variables**. Add (for Production, Preview and Development):

   | Name | Value | Required |
   |---|---|---|
   | `SUPABASE_URL` | your Project URL | yes |
   | `SUPABASE_ANON_KEY` | your **publishable** (or anon) key | yes |
   | `AI_API_KEY` | key from an AI provider | optional |
   | `AI_MODEL` | model name from your provider | optional |
   | `AI_API_URL` | defaults to `https://api.openai.com/v1/chat/completions` | optional |
   | `AI_DAILY_LIMIT` | requests per person per day, default `20` | optional |

2. **Deployments -> latest -> ... -> Redeploy**. (Environment variables are read when the site is built, so always redeploy after changing them.)
3. Open https://www.takethecross.app. You should see the email sign-in screen.

### 5. Make yourself the admin
1. On the live site, sign in with your email and create your avatar.
2. Supabase -> **SQL Editor** -> run (with your real email):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```
3. Reload the site -> **Armory** tab -> **Open admin dashboard**.

### 6. Optional: daily study guide, quiz and feedback
The recap, key verse, map and quiz, plus reflection feedback, are generated by an AI service. They stay off until `AI_API_KEY` and `AI_MODEL` are set (step 4). Without them the app still has listening links, streaks, ranks, reflections with shared answers, comments, prayers and the leaderboard. This service is billed by your AI provider. `AI_DAILY_LIMIT` caps each person's daily use.

---

## Daily map and weekly goals

- **Where we are:** every day shows the exact readings from the official Bible in a Year plan and a map with numbered pins for the places in those readings, with a short note for each. It works without the optional study-guide service. Zoom buttons: Auto (fits the day's places), Close-up, Region, Wide. Some places are traditional or approximate (Eden, Mount Sinai and others) and the app says so.
- **Your week (private):** everyone gets the same weekly goal, rotating each week (finish 5 episodes, read on 4 different days, write 3 reflections). Only the person sees their own progress. Reaching it earns 15 XP.
- **Our week together:** one shared bar toward the team goal, built from group totals only. The database function `team_totals()` returns counts, never names. The goal scales with how many people were active in the last 30 days. When the team reaches it, everyone who read that week earns 25 XP.
- **Community badges:** unlock at 50, 100, 250, 500, 1,000, 2,500, 5,000 and 10,000 episodes finished by everyone together.
- **Updating an existing project:** run `team-update.sql` in the Supabase SQL Editor, then upload the changed files in one commit.

---

## Who can see what

| Information | Seen by |
|---|---|
| Display name, avatar, rank, XP, days finished, streak, badges | **Everyone**, including visitors who aren't signed in (the leaderboard) |
| Comments, shared reflections, prayer requests, reactions, encouragements | Signed-in users |
| Full reading history, private notes and feedback | **Only the person themselves** |
| Email address | The person and you (Supabase dashboard -> Authentication). Never shown to other users, never copied into the app's tables |
| When a profile was created, when someone was last active, total users | **Only admins** (Admin dashboard) |

Tables: `profiles` (public leaderboard), `progress` (private), `activity` (admin-only), `admins`, `days`, `comments`, `reflections`, `journal` (private), `reactions`, `cheers`, `prayers`, `ai_usage`. Row Level Security is on for all of them; see `schema.sql` for every policy.

## Security notes
- Only the public Supabase URL and publishable/anon key are in the website. They are designed to be public; the database rules (RLS + server functions) are what protect the data. The build refuses to run if it is given a secret key.
- Profiles, progress, activity and day content can only be changed through server functions that check who is calling.
- Admin tools are enforced in the database (`is_admin()`), not just hidden in the page.
- A Content-Security-Policy and other protective headers are set in `vercel.json`. If you add a service that loads scripts from another site (for example analytics), add its address to that policy.
- Leaderboard numbers are reported by each person's app (trust-based, fine for a community, not tamper-proof).
- Two devices signed in at once: the app re-checks on focus, but if you mark progress on two devices at the same moment, the last save wins.

## Updating the site
1. Change the files in GitHub (edit in place, or upload replacements).
2. Vercel redeploys automatically on every commit. No new link is needed.
3. If a change touches the database, run the new SQL in Supabase's SQL Editor (`schema.sql` is safe to run again).

Brand name and address live at the top of `app.js` (`APP_NAME`, `APP_URL`) and in `index.html`, `manifest.webmanifest`, `vercel.json`.

## Troubleshooting
- **No sign-in email arrives**: custom SMTP must be on (step 3); check spam; wait 60 seconds between requests.
- **Email shows a link but no code**: the template in step 3.4 needs `{{ .Token }}` in both templates.
- **Site says progress is saved on this device only**: `SUPABASE_URL` / `SUPABASE_ANON_KEY` aren't set, or you didn't redeploy after adding them.
- **Build fails mentioning a missing file**: upload every file from the project to the repository root.
- **Admin button missing**: run the step 5 SQL with the exact email you signed in with, then reload.
- **Study guide button missing**: `AI_API_KEY` and `AI_MODEL` are not both set, or `api/ai.js` is missing.
- **Scale**: the leaderboard loads the top 200 profiles by XP. Everyone counts toward the shared weekly team challenge, so very large groups would benefit from private groups (not built yet).
