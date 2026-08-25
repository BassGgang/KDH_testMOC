-- =============================================================================
-- Fix: infinite recursion between athletes and athlete_coach RLS policies.
--
-- athletes_coach_select (on athletes) selects from athlete_coach, while
-- athlete_coach_athlete_select (on athlete_coach) selects from athletes.
-- Evaluating either policy recurses into the other and Postgres aborts with
-- "infinite recursion detected in policy for relation athletes". The loop also
-- poisons every table whose policies read athletes (matches,
-- athlete_stats_cache).
--
-- Fix: route both link checks through SECURITY DEFINER helpers (same pattern
-- as app_current_role()) so the inner lookup bypasses RLS and the cycle is
-- broken. Row visibility is unchanged: each helper re-checks auth.uid().
-- =============================================================================

create or replace function public.is_coach_of_athlete(target_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.athlete_coach ac
    where ac.athlete_id = target_athlete
      and ac.coach_id = auth.uid()
  );
$$;

create or replace function public.is_own_athlete(target_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.athletes a
    where a.id = target_athlete
      and a.user_id = auth.uid()
  );
$$;

drop policy if exists athletes_coach_select on public.athletes;
create policy athletes_coach_select
  on public.athletes
  for select
  using (public.is_coach_of_athlete(athletes.id));

drop policy if exists athlete_coach_athlete_select on public.athlete_coach;
create policy athlete_coach_athlete_select
  on public.athlete_coach
  for select
  using (public.is_own_athlete(athlete_coach.athlete_id));

-- -----------------------------------------------------------------------------
-- Backfill profiles for users who signed up before the on_auth_user_created
-- trigger (added in 0003) reached this database. Mirrors handle_new_user()
-- defaults; idempotent via on conflict.
-- -----------------------------------------------------------------------------
insert into public.profiles (id, role, display_name)
select u.id,
       'athlete',
       coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'User')
from auth.users u
on conflict (id) do nothing;
