-- =============================================================================
-- 0002_rls.sql
-- Row Level Security policies.
--
-- Write paths go through /api/sync/* using the service_role key (which bypasses
-- RLS), so the policies here primarily constrain SELECT for the viewer app.
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.athletes              enable row level security;
alter table public.athlete_coach         enable row level security;
alter table public.tournaments           enable row level security;
alter table public.tournament_categories enable row level security;
alter table public.brackets              enable row level security;
alter table public.bracket_slots         enable row level security;
alter table public.matches               enable row level security;
alter table public.scoring_events        enable row level security;
alter table public.athlete_stats_cache   enable row level security;

-- -----------------------------------------------------------------------------
-- profiles: each user can see their own profile.
-- -----------------------------------------------------------------------------
create policy profiles_self_select
  on public.profiles
  for select
  using (id = auth.uid());

create policy profiles_operator_select_all
  on public.profiles
  for select
  using (public.current_role() = 'operator');

-- -----------------------------------------------------------------------------
-- athletes: operator sees all; coach sees own athletes; athlete sees self.
-- -----------------------------------------------------------------------------
create policy athletes_operator_select_all
  on public.athletes
  for select
  using (public.current_role() = 'operator');

create policy athletes_self_select
  on public.athletes
  for select
  using (user_id = auth.uid());

create policy athletes_coach_select
  on public.athletes
  for select
  using (
    exists (
      select 1 from public.athlete_coach
      where athlete_coach.athlete_id = athletes.id
        and athlete_coach.coach_id = auth.uid()
    )
  );

-- Self-registration: athletes can insert their own athlete row.
create policy athletes_self_insert
  on public.athletes
  for insert
  with check (user_id = auth.uid() and public.current_role() = 'athlete');

create policy athletes_self_update
  on public.athletes
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- athlete_coach: visible to the linked athlete and the linked coach.
-- -----------------------------------------------------------------------------
create policy athlete_coach_operator_select_all
  on public.athlete_coach
  for select
  using (public.current_role() = 'operator');

create policy athlete_coach_coach_select
  on public.athlete_coach
  for select
  using (coach_id = auth.uid());

create policy athlete_coach_athlete_select
  on public.athlete_coach
  for select
  using (
    exists (
      select 1 from public.athletes
      where athletes.id = athlete_coach.athlete_id
        and athletes.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- tournaments / categories / brackets / bracket_slots: readable by any
-- authenticated user. Writes are operator-only via the API.
-- -----------------------------------------------------------------------------
create policy tournaments_authenticated_select
  on public.tournaments for select using (auth.uid() is not null);

create policy tournament_categories_authenticated_select
  on public.tournament_categories for select using (auth.uid() is not null);

create policy brackets_authenticated_select
  on public.brackets for select using (auth.uid() is not null);

create policy bracket_slots_authenticated_select
  on public.bracket_slots for select using (auth.uid() is not null);

create policy tournaments_operator_write
  on public.tournaments for all
  using (public.current_role() = 'operator')
  with check (public.current_role() = 'operator');

create policy tournament_categories_operator_write
  on public.tournament_categories for all
  using (public.current_role() = 'operator')
  with check (public.current_role() = 'operator');

create policy brackets_operator_write
  on public.brackets for all
  using (public.current_role() = 'operator')
  with check (public.current_role() = 'operator');

create policy bracket_slots_operator_write
  on public.bracket_slots for all
  using (public.current_role() = 'operator')
  with check (public.current_role() = 'operator');

-- -----------------------------------------------------------------------------
-- matches: visible to participating athletes, their coaches, and operators.
-- -----------------------------------------------------------------------------
create policy matches_operator_select_all
  on public.matches
  for select
  using (public.current_role() = 'operator');

create policy matches_participant_select
  on public.matches
  for select
  using (
    exists (
      select 1 from public.athletes a
      where (a.id = matches.aka_athlete_id or a.id = matches.ao_athlete_id)
        and a.user_id = auth.uid()
    )
  );

create policy matches_coach_select
  on public.matches
  for select
  using (
    exists (
      select 1 from public.athlete_coach ac
      where (ac.athlete_id = matches.aka_athlete_id or ac.athlete_id = matches.ao_athlete_id)
        and ac.coach_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- scoring_events: same visibility as the parent match.
-- -----------------------------------------------------------------------------
create policy scoring_events_select
  on public.scoring_events
  for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = scoring_events.match_id
        and (
          public.current_role() = 'operator'
          or exists (
            select 1 from public.athletes a
            where (a.id = m.aka_athlete_id or a.id = m.ao_athlete_id)
              and a.user_id = auth.uid()
          )
          or exists (
            select 1 from public.athlete_coach ac
            where (ac.athlete_id = m.aka_athlete_id or ac.athlete_id = m.ao_athlete_id)
              and ac.coach_id = auth.uid()
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- athlete_stats_cache: same visibility rules as athletes.
-- -----------------------------------------------------------------------------
create policy athlete_stats_cache_select
  on public.athlete_stats_cache
  for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_stats_cache.athlete_id
        and (
          public.current_role() = 'operator'
          or a.user_id = auth.uid()
          or exists (
            select 1 from public.athlete_coach ac
            where ac.athlete_id = a.id and ac.coach_id = auth.uid()
          )
        )
    )
  );
