-- Take the Cross: team challenge update.
-- Supabase -> SQL Editor -> New query -> paste this -> Run. Safe to run again. It changes no data.

-- =====================================================================
-- TEAM TOTALS: group numbers for the weekly team challenge and community badges.
-- Returns counts only. It never returns names, emails, or any one person's numbers.
-- =====================================================================
create or replace function public.safe_int(t text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when t ~ '^[0-9]{1,7}$' then t::integer else 0 end;
$$;

create or replace function public.team_totals(p_week text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_week is null or p_week !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'invalid week';
  end if;
  return (
    select jsonb_build_object(
      'members',        count(*),
      'episodes_total', coalesce(sum(x.done), 0),
      'active_30d',     count(*) filter (where x.active),
      'readers',        count(*) filter (where x.ad > 0),
      'ep',             coalesce(sum(x.ep), 0),
      'rf',             coalesce(sum(x.rf), 0),
      'qp',             coalesce(sum(x.qp), 0),
      'ad',             coalesce(sum(x.ad), 0)
    )
    from (
      select p.days_done as done,
             coalesce(a.last_active_at > now() - interval '30 days', false) as active,
             public.safe_int(p.stats #>> array['wk', p_week, 'ep']) as ep,
             public.safe_int(p.stats #>> array['wk', p_week, 'rf']) as rf,
             public.safe_int(p.stats #>> array['wk', p_week, 'qp']) as qp,
             public.safe_int(p.stats #>> array['wk', p_week, 'ad']) as ad
      from public.profiles p
      left join public.activity a on a.user_id = p.id
    ) x
  );
end;
$$;

revoke execute on function public.safe_int(text)   from public, anon;
revoke execute on function public.team_totals(text) from public, anon;
grant  execute on function public.team_totals(text) to authenticated;
