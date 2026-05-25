-- =============================================================================
-- 0001_init.sql
-- Initial schema for karate-system. Tables, constraints, indexes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 profiles  (extends auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('operator', 'coach', 'athlete')),
  display_name text not null,
  created_at   timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- -----------------------------------------------------------------------------
-- 6.2 athletes & athlete_coach
-- -----------------------------------------------------------------------------
create table public.athletes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  name         text not null,
  rank         text not null,
  affiliation  text,
  birth_date   date,
  gender       text check (gender in ('male', 'female')),
  weight_kg    numeric(5,2) check (weight_kg is null or weight_kg > 0),
  created_at   timestamptz not null default now()
);

create unique index athletes_user_id_uidx on public.athletes(user_id) where user_id is not null;
create index athletes_name_idx on public.athletes(name);

create table public.athlete_coach (
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  coach_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (athlete_id, coach_id)
);

create index athlete_coach_coach_idx on public.athlete_coach(coach_id);

-- -----------------------------------------------------------------------------
-- 6.3 tournaments / categories / brackets
-- -----------------------------------------------------------------------------
create table public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  date        date not null,
  status      text not null check (status in ('Draft', 'Ongoing', 'Completed')),
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index tournaments_date_idx on public.tournaments(date desc);
create index tournaments_status_idx on public.tournaments(status);

create table public.tournament_categories (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  age_division   text not null,
  gender         text not null check (gender in ('male', 'female')),
  weight_class   text not null,
  match_type     text not null check (match_type in ('Kumite'))   -- MVP: Kumite only
);

create index tournament_categories_tournament_idx
  on public.tournament_categories(tournament_id);

create table public.brackets (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.tournament_categories(id) on delete cascade,
  format        text not null check (format in ('single_elim', 'double_elim', 'round_robin', 'league_to_knockout')),
  size          int  not null check (size > 0),
  generated_at  timestamptz not null default now()
);

create index brackets_category_idx on public.brackets(category_id);

-- -----------------------------------------------------------------------------
-- 6.4 matches
-- (Defined before bracket_slots because bracket_slots references matches.)
-- -----------------------------------------------------------------------------
create table public.matches (
  id              uuid primary key,                                -- device-generated UUIDv7
  tournament_id   uuid references public.tournaments(id) on delete cascade,
  category_id     uuid references public.tournament_categories(id),
  type            text not null check (type in ('Kumite')),
  round           int  not null,
  aka_athlete_id  uuid references public.athletes(id),
  ao_athlete_id   uuid references public.athletes(id),
  winner_id       uuid references public.athletes(id),
  win_reason      text check (win_reason in
                    ('point_gap', 'target_score', 'time_up', 'hansoku', 'kiken', 'shikkaku', 'hantei')),
  senshu_holder   text check (senshu_holder in ('AKA', 'AO')),
  referee_id      uuid references auth.users(id),
  tatami_no       int,
  start_time      timestamptz,
  end_time        timestamptz,
  status          text not null check (status in ('Scheduled', 'Live', 'Completed')),
  settings        jsonb not null,
  created_at      timestamptz not null default now(),
  finalized_at    timestamptz,
  constraint matches_distinct_athletes
    check (aka_athlete_id is null or ao_athlete_id is null or aka_athlete_id <> ao_athlete_id),
  constraint matches_time_order
    check (end_time is null or start_time is null or end_time >= start_time)
);

create index matches_tournament_idx on public.matches(tournament_id);
create index matches_category_idx on public.matches(category_id);
create index matches_status_idx on public.matches(status);
create index matches_aka_athlete_idx on public.matches(aka_athlete_id);
create index matches_ao_athlete_idx on public.matches(ao_athlete_id);

-- -----------------------------------------------------------------------------
-- 6.3 bracket_slots (after matches)
-- -----------------------------------------------------------------------------
create table public.bracket_slots (
  id                   uuid primary key default gen_random_uuid(),
  bracket_id           uuid not null references public.brackets(id) on delete cascade,
  round                int not null,
  position             int not null,
  athlete_id           uuid references public.athletes(id),
  match_id             uuid references public.matches(id),
  advances_to_slot_id  uuid references public.bracket_slots(id),
  unique (bracket_id, round, position)
);

create index bracket_slots_bracket_round_idx
  on public.bracket_slots(bracket_id, round);

-- -----------------------------------------------------------------------------
-- 6.4 scoring_events
-- -----------------------------------------------------------------------------
create table public.scoring_events (
  id              uuid primary key,                                -- device-generated UUIDv7
  match_id        uuid not null references public.matches(id) on delete cascade,
  side            text not null check (side in ('AKA', 'AO')),
  kind            text not null check (kind in
                    ('ippon', 'waza_ari', 'yuko', 'c1', 'c2', 'hansoku', 'kiken', 'shikkaku')),
  technique       text,
  occurred_at_ms  int not null check (occurred_at_ms >= 0),
  created_by      uuid references auth.users(id),
  received_at     timestamptz not null default now()
);

create index scoring_events_match_idx on public.scoring_events(match_id);
create index scoring_events_match_time_idx on public.scoring_events(match_id, occurred_at_ms);

-- -----------------------------------------------------------------------------
-- 6.5 athlete_stats_cache
-- -----------------------------------------------------------------------------
create table public.athlete_stats_cache (
  athlete_id   uuid primary key references public.athletes(id) on delete cascade,
  attack       numeric(5,2),
  defense      numeric(5,2),
  speed        numeric(5,2),
  stamina      numeric(5,2),
  win_rate     numeric(5,2),
  match_count  int not null default 0,
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helper function: get current user's role.
-- Marked stable so RLS planner can cache the result per query.
-- -----------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;
