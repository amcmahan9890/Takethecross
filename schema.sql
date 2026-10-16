-- =====================================================================
-- TAKE THE CROSS - Supabase database setup
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. It is safe to run again later (it will not delete data).
--
-- WHO CAN SEE WHAT
--   PUBLIC (any visitor, no sign-in):  profiles  (display name, avatar, rank/XP, days finished, streak, badges)
--   SIGNED-IN USERS ONLY:              days, comments, reflections (only ones a user chose to share),
--                                      reactions, cheers, prayers
--   PRIVATE TO EACH USER:              progress (full reading history), journal (private notes + feedback)
--   ADMIN ONLY:                        activity (created_at, last_active_at), admin_overview(), admin_users()
--   NOBODY (via the website):          admins, ai_usage
--   Emails live in Supabase's own auth system and are never copied into these tables.
--
-- HOW WRITING WORKS
--   profiles / progress / activity / days are written ONLY through the functions at the bottom
--   (save_player, save_day, touch_activity), which check who is calling. Everything else uses
--   Row Level Security policies so users can only change their own rows.
-- =====================================================================


-- =====================================================================
-- 1. TABLES
-- =====================================================================

-- PUBLIC leaderboard profile. One row per user. id = the sign-in account id.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text    not null check (char_length(display_name) between 1 and 24),
  avatar       jsonb   not null default '{}'::jsonb,           -- {cls, color, skin}
  xp           integer not null default 0 check (xp >= 0),
  days_done    integer not null default 0 check (days_done between 0 and 365),
  stats        jsonb   not null default '{}'::jsonb            -- small public summary (streak, badges, weekly totals)
);
create index if not exists profiles_xp_idx on public.profiles (xp desc, days_done desc);

-- PRIVATE full progress document. Only the owner can read it.
create table if not exists public.progress (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ADMIN-ONLY activity log (when a profile was created, when it was last active).
create table if not exists public.activity (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Who is an administrator. Nobody can read or write this through the website.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Shared content for each day (recap, verse, map, quiz, YouTube link).
create table if not exists public.days (
  day        integer primary key check (day between 1 and 365),
  content    jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Day discussion comments.
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  day        integer     not null check (day between 1 and 365),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);
create index if not exists comments_day_idx on public.comments (day, created_at);

-- Reflection answers a user chose to SHARE with the group.
create table if not exists public.reflections (
  day        integer     not null check (day between 1 and 365),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  answers    jsonb       not null default '[]'::jsonb,
  takeaway   text        not null default '' check (char_length(takeaway) <= 1500),
  updated_at timestamptz not null default now(),
  primary key (day, user_id)
);

-- PRIVATE per-day notes and feedback. Only the owner can read them.
create table if not exists public.journal (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  day        integer     not null check (day between 1 and 365),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- "Amen" reactions on comments, shared reflections and prayer requests.
create table if not exists public.reactions (
  scope      text        not null check (char_length(scope) <= 20),
  target     text        not null check (char_length(target) <= 80),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (target, user_id)
);
create index if not exists reactions_scope_idx on public.reactions (scope);

-- Encouragements sent from one user to another (one per sender, receiver and day).
create table if not exists public.cheers (
  to_user    uuid        not null references public.profiles (id) on delete cascade,
  from_user  uuid        not null references public.profiles (id) on delete cascade,
  sent_on    date        not null default current_date,
  kind       text        not null check (kind in ('amen', 'go', 'pray', 'proud')),
  created_at timestamptz not null default now(),
  primary key (to_user, from_user, sent_on),
  check (to_user <> from_user)
);

-- Prayer requests.
create table if not exists public.prayers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(body) between 1 and 600),
  answered   boolean     not null default false,
  created_at timestamptz not null default now()
);
create index if not exists prayers_created_idx on public.prayers (created_at desc);

-- Daily counter that limits optional AI requests per user.
create table if not exists public.ai_usage (
  user_id uuid    not null references auth.users (id) on delete cascade,
  used_on date    not null default current_date,
  calls   integer not null default 0,
  primary key (user_id, used_on)
);


-- =====================================================================
-- 2. HELPER: is the caller an administrator?
-- =====================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;


-- =====================================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.progress    enable row level security;
alter table public.activity    enable row level security;
alter table public.admins      enable row level security;
alter table public.days        enable row level security;
alter table public.comments    enable row level security;
alter table public.reflections enable row level security;
alter table public.journal     enable row level security;
alter table public.reactions   enable row level security;
alter table public.cheers      enable row level security;
alter table public.prayers     enable row level security;
alter table public.ai_usage    enable row level security;

-- profiles: anyone may read (this is the public leaderboard). No direct writes - use save_player().
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);

-- progress: owner reads only. Written by save_player().
drop policy if exists "progress owner reads" on public.progress;
create policy "progress owner reads" on public.progress
  for select to authenticated using (user_id = (select auth.uid()));

-- activity: administrators only.
drop policy if exists "activity admin reads" on public.activity;
create policy "activity admin reads" on public.activity
  for select to authenticated using (public.is_admin());

-- admins, ai_usage: no policies = no access through the website at all.

-- days: signed-in users read. Written by save_day().
drop policy if exists "days signed-in read" on public.days;
create policy "days signed-in read" on public.days
  for select to authenticated using (true);

-- comments
drop policy if exists "comments signed-in read" on public.comments;
create policy "comments signed-in read" on public.comments
  for select to authenticated using (true);
drop policy if exists "comments own insert" on public.comments;
create policy "comments own insert" on public.comments
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "comments own or admin delete" on public.comments;
create policy "comments own or admin delete" on public.comments
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- reflections (shared answers)
drop policy if exists "reflections signed-in read" on public.reflections;
create policy "reflections signed-in read" on public.reflections
  for select to authenticated using (true);
drop policy if exists "reflections own insert" on public.reflections;
create policy "reflections own insert" on public.reflections
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "reflections own update" on public.reflections;
create policy "reflections own update" on public.reflections
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "reflections own delete" on public.reflections;
create policy "reflections own delete" on public.reflections
  for delete to authenticated using (user_id = (select auth.uid()));

-- journal (private)
drop policy if exists "journal own read" on public.journal;
create policy "journal own read" on public.journal
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "journal own insert" on public.journal;
create policy "journal own insert" on public.journal
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "journal own update" on public.journal;
create policy "journal own update" on public.journal
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "journal own delete" on public.journal;
create policy "journal own delete" on public.journal
  for delete to authenticated using (user_id = (select auth.uid()));

-- reactions
drop policy if exists "reactions signed-in read" on public.reactions;
create policy "reactions signed-in read" on public.reactions
  for select to authenticated using (true);
drop policy if exists "reactions own insert" on public.reactions;
create policy "reactions own insert" on public.reactions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "reactions own delete" on public.reactions;
create policy "reactions own delete" on public.reactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- cheers
drop policy if exists "cheers signed-in read" on public.cheers;
create policy "cheers signed-in read" on public.cheers
  for select to authenticated using (true);
drop policy if exists "cheers own insert" on public.cheers;
create policy "cheers own insert" on public.cheers
  for insert to authenticated with check (from_user = (select auth.uid()));
drop policy if exists "cheers own update" on public.cheers;
create policy "cheers own update" on public.cheers
  for update to authenticated
  using (from_user = (select auth.uid())) with check (from_user = (select auth.uid()));

-- prayers
drop policy if exists "prayers signed-in read" on public.prayers;
create policy "prayers signed-in read" on public.prayers
  for select to authenticated using (true);
drop policy if exists "prayers own insert" on public.prayers;
create policy "prayers own insert" on public.prayers
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "prayers own update" on public.prayers;
create policy "prayers own update" on public.prayers
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "prayers own or admin delete" on public.prayers;
create policy "prayers own or admin delete" on public.prayers
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_admin());


-- =====================================================================
-- 4. TABLE PRIVILEGES (explicit, so they do not depend on Supabase defaults)
--    First remove everything, then grant only what each role needs.
--    Row Level Security (section 3) still decides which ROWS each person can touch.
-- =====================================================================
grant usage on schema public to anon, authenticated;

revoke all on public.profiles, public.progress, public.activity, public.admins, public.days,
              public.comments, public.reflections, public.journal, public.reactions,
              public.cheers, public.prayers, public.ai_usage
  from anon, authenticated;

-- Visitors who are not signed in: read the public leaderboard only.
grant select on public.profiles to anon, authenticated;

-- Signed-in users: read-only on these (they are written only by the functions in section 5).
grant select on public.progress, public.activity, public.days to authenticated;

-- Signed-in users: normal reads/writes, limited to their own rows by the policies above.
grant select, insert, delete          on public.comments    to authenticated;
grant select, insert, update, delete  on public.reflections to authenticated;
grant select, insert, update, delete  on public.journal     to authenticated;
grant select, insert, delete          on public.reactions   to authenticated;
grant select, insert, update          on public.cheers      to authenticated;
grant select, insert, update, delete  on public.prayers     to authenticated;

-- admins and ai_usage: no access from the website at all.


-- =====================================================================
-- 5. FUNCTIONS THE WEBSITE CALLS (each one checks who is calling)
-- =====================================================================

-- Create or update my profile and progress in one step.
create or replace function public.save_player(p_name text, p_avatar jsonb, p_stats jsonb, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid    := auth.uid();
  nm     text    := btrim(coalesce(p_name, ''));
  av     jsonb   := coalesce(p_avatar, '{}'::jsonb);
  st     jsonb   := coalesce(p_stats, '{}'::jsonb);
  dt     jsonb   := coalesce(p_data, '{}'::jsonb);
  v_xp   integer := least(greatest(coalesce((st ->> 'xp')::integer, 0), 0), 1000000);
  v_done integer := least(greatest(coalesce((st ->> 'done')::integer, 0), 0), 365);
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if char_length(nm) < 1 or char_length(nm) > 24 then
    raise exception 'invalid name';
  end if;
  if coalesce(av ->> 'color', '#000000') !~ '^#[0-9A-Fa-f]{6}$'
     or coalesce(av ->> 'skin', '#000000') !~ '^#[0-9A-Fa-f]{6}$'
     or coalesce(av ->> 'cls', 'crusader') !~ '^[a-z]{3,12}$' then
    raise exception 'invalid avatar';
  end if;
  if pg_column_size(dt) > 250000 or pg_column_size(st) > 20000 then
    raise exception 'progress too large';
  end if;

  insert into public.profiles (id, display_name, avatar, stats, xp, days_done)
  values (uid, nm, av, st, v_xp, v_done)
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar       = excluded.avatar,
        stats        = excluded.stats,
        xp           = excluded.xp,
        days_done    = excluded.days_done;

  insert into public.progress (user_id, data, updated_at)
  values (uid, dt, now())
  on conflict (user_id) do update
    set data = excluded.data, updated_at = now();

  insert into public.activity (user_id)
  values (uid)
  on conflict (user_id) do update
    set last_active_at = now();
end;
$$;

-- Note that I was active just now (called when the app opens).
create or replace function public.touch_activity()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.activity set last_active_at = now() where user_id = auth.uid();
$$;

-- Save the shared content for a day. Anyone signed in may fill in a day that has not been prepared yet;
-- only administrators may change a day that is already prepared or edit its YouTube link.
create or replace function public.save_day(p_day integer, p_content jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing jsonb;
  v_admin  boolean := public.is_admin();
  c        jsonb   := coalesce(p_content, '{}'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_day is null or p_day < 1 or p_day > 365 then
    raise exception 'invalid day';
  end if;
  if pg_column_size(c) > 60000 then
    raise exception 'content too large';
  end if;

  select d.content into existing from public.days d where d.day = p_day;

  if not v_admin then
    if existing is not null and (existing -> 'recap') is not null then
      raise exception 'already prepared';
    end if;
    c := c - 'yt';
    if existing is not null and (existing -> 'yt') is not null then
      c := c || jsonb_build_object('yt', existing -> 'yt');
    end if;
  end if;

  insert into public.days (day, content, updated_at)
  values (p_day, c, now())
  on conflict (day) do update
    set content = excluded.content, updated_at = now();
end;
$$;

-- Permanently delete my account and everything that belongs to it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Count one optional AI request for me today. Returns false once I am over the limit.
create or replace function public.use_ai_quota(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.ai_usage as u (user_id, used_on, calls)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, used_on) do update
    set calls = u.calls + 1
  returning u.calls into n;
  return n <= greatest(coalesce(p_limit, 20), 1);
end;
$$;


-- =====================================================================
-- 6. ADMIN FUNCTIONS (refuse to run unless the caller is in the admins table)
-- =====================================================================
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_users',   (select count(*) from public.profiles),
    'new_7d',        (select count(*) from public.activity where created_at > now() - interval '7 days'),
    'new_30d',       (select count(*) from public.activity where created_at > now() - interval '30 days'),
    'active_24h',    (select count(*) from public.activity where last_active_at > now() - interval '24 hours'),
    'active_7d',     (select count(*) from public.activity where last_active_at > now() - interval '7 days'),
    'active_30d',    (select count(*) from public.activity where last_active_at > now() - interval '30 days'),
    'days_finished', (select coalesce(sum(days_done), 0) from public.profiles),
    'comments',      (select count(*) from public.comments),
    'prayers',       (select count(*) from public.prayers)
  );
end;
$$;

create or replace function public.admin_users(p_limit integer default 50, p_offset integer default 0)
returns table (
  id             uuid,
  display_name   text,
  avatar         jsonb,
  created_at     timestamptz,
  last_active_at timestamptz,
  days_done      integer,
  xp             integer,
  streak         integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select p.id,
           p.display_name,
           p.avatar,
           a.created_at,
           a.last_active_at,
           p.days_done,
           p.xp,
           case when (p.stats ->> 'streak') ~ '^[0-9]{1,4}$' then (p.stats ->> 'streak')::integer else 0 end
    from public.profiles p
    left join public.activity a on a.user_id = p.id
    order by a.last_active_at desc nulls last, p.xp desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;


-- =====================================================================
-- 7. WHO MAY CALL THE FUNCTIONS (signed-in users only; never visitors)
-- =====================================================================
revoke execute on function public.is_admin()                                   from public, anon;
revoke execute on function public.save_player(text, jsonb, jsonb, jsonb)       from public, anon;
revoke execute on function public.touch_activity()                             from public, anon;
revoke execute on function public.save_day(integer, jsonb)                     from public, anon;
revoke execute on function public.delete_my_account()                          from public, anon;
revoke execute on function public.use_ai_quota(integer)                        from public, anon;
revoke execute on function public.admin_overview()                             from public, anon;
revoke execute on function public.admin_users(integer, integer)                from public, anon;

grant execute on function public.is_admin()                                    to authenticated;
grant execute on function public.save_player(text, jsonb, jsonb, jsonb)        to authenticated;
grant execute on function public.touch_activity()                              to authenticated;
grant execute on function public.save_day(integer, jsonb)                      to authenticated;
grant execute on function public.delete_my_account()                           to authenticated;
grant execute on function public.use_ai_quota(integer)                         to authenticated;
grant execute on function public.admin_overview()                              to authenticated;
grant execute on function public.admin_users(integer, integer)                 to authenticated;


-- =====================================================================
-- 8. LIVE UPDATES (Realtime) - lets everyone's leaderboard refresh automatically
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'days', 'comments', 'reflections', 'reactions', 'cheers', 'prayers'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;


-- =====================================================================
-- 9. MAKE YOURSELF THE ADMIN  (run this separately, AFTER you have signed in to the live site once)
-- =====================================================================
-- Replace the email with the one you signed in with, remove the two dashes at the start of each line, and Run:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
