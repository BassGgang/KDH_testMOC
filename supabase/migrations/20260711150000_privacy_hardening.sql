-- Privacy and integrity hardening for production use with minors' data.

-- ---------------------------------------------------------------------------
-- Minimal, append-only audit trail. Do not copy row contents or PII into it.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  request_id  uuid not null default gen_random_uuid(),
  metadata    jsonb not null default '{}'::jsonb,
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists audit_events_occurred_at_idx
  on public.audit_events (occurred_at desc);
create index if not exists audit_events_entity_idx
  on public.audit_events (entity_type, entity_id, occurred_at desc);

alter table public.audit_events enable row level security;

drop policy if exists audit_events_operator_select on public.audit_events;
create policy audit_events_operator_select on public.audit_events
  for select using (public.app_current_role() = 'operator');

revoke all on table public.audit_events from public, anon, authenticated;
grant select on table public.audit_events to authenticated;

-- Authenticated browser clients may only read the minimum athlete projection.
-- RLS still narrows rows to operator/self/assigned coach. Exact birth date,
-- gender and measured weight remain server/admin-only fields.
revoke select on table public.athletes from authenticated;
revoke select on table public.athletes from anon;
grant select (id, user_id, name, rank, affiliation, created_at)
  on public.athletes to authenticated;

create or replace function public.capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid;
begin
  v_id := case when tg_op = 'DELETE' then old.id else new.id end;
  v_actor := auth.uid();

  -- service_role sync writes have no auth.uid(); scoring rows preserve the
  -- verified API caller in created_by specifically for attribution.
  if v_actor is null and tg_table_name = 'scoring_events' and tg_op <> 'DELETE' then
    v_actor := new.created_by;
  end if;

  insert into public.audit_events (actor_id, action, entity_type, entity_id)
  values (v_actor, lower(tg_op), tg_table_name, v_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.capture_audit_event() from public, anon, authenticated;

drop trigger if exists audit_profiles_changes on public.profiles;
create trigger audit_profiles_changes after insert or update or delete on public.profiles
  for each row execute function public.capture_audit_event();
drop trigger if exists audit_athletes_changes on public.athletes;
create trigger audit_athletes_changes after insert or update or delete on public.athletes
  for each row execute function public.capture_audit_event();
drop trigger if exists audit_tournaments_changes on public.tournaments;
create trigger audit_tournaments_changes after insert or update or delete on public.tournaments
  for each row execute function public.capture_audit_event();
drop trigger if exists audit_matches_changes on public.matches;
create trigger audit_matches_changes after insert or update or delete on public.matches
  for each row execute function public.capture_audit_event();
drop trigger if exists audit_scoring_events_changes on public.scoring_events;
create trigger audit_scoring_events_changes after insert or update or delete on public.scoring_events
  for each row execute function public.capture_audit_event();

-- ---------------------------------------------------------------------------
-- Internal SECURITY DEFINER helpers must not be callable through PostgREST.
-- PostgreSQL grants EXECUTE to PUBLIC on new functions unless explicitly revoked.
-- ---------------------------------------------------------------------------
revoke all on function public.advance_winner(uuid) from public, anon, authenticated;
revoke all on function public.refresh_athlete_stats(uuid) from public, anon, authenticated;
revoke all on function public.finish_match(jsonb, jsonb) from public, anon;
revoke all on function public.create_tournament(text, date, text, text, text, int, jsonb) from public, anon;

-- ---------------------------------------------------------------------------
-- Atomically lock two bracket slots, create one match, and link both slots.
-- Concurrent/replayed requests return the same match.
-- ---------------------------------------------------------------------------
create or replace function public.start_bracket_match(
  p_bracket_id uuid,
  p_round int,
  p_position int,
  p_settings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lower public.bracket_slots%rowtype;
  v_upper public.bracket_slots%rowtype;
  v_category uuid;
  v_tournament uuid;
  v_match uuid;
  v_reused boolean := false;
begin
  if public.app_current_role() is distinct from 'operator' then
    raise exception 'start_bracket_match requires the operator role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_round < 1 or p_position < 0 or p_position % 2 <> 0 then
    raise exception 'invalid round or position' using errcode = 'check_violation';
  end if;

  select * into v_lower from public.bracket_slots
   where bracket_id = p_bracket_id and round = p_round and position = p_position
   for update;
  select * into v_upper from public.bracket_slots
   where bracket_id = p_bracket_id and round = p_round and position = p_position + 1
   for update;

  if v_lower.id is null or v_upper.id is null then
    raise exception 'both bracket slots must exist' using errcode = 'check_violation';
  end if;
  if v_lower.athlete_id is null or v_upper.athlete_id is null then
    raise exception 'both bracket slots must contain an athlete' using errcode = 'check_violation';
  end if;

  select b.category_id, tc.tournament_id into v_category, v_tournament
    from public.brackets b
    join public.tournament_categories tc on tc.id = b.category_id
   where b.id = p_bracket_id;
  if v_category is null then
    raise exception 'bracket not found' using errcode = 'no_data_found';
  end if;

  if v_lower.match_id is not null or v_upper.match_id is not null then
    if v_lower.match_id is distinct from v_upper.match_id then
      raise exception 'bracket slots contain inconsistent match ids' using errcode = 'data_exception';
    end if;
    v_match := v_lower.match_id;
    v_reused := true;
  else
    v_match := gen_random_uuid();
    insert into public.matches (
      id, tournament_id, category_id, type, round, aka_athlete_id,
      ao_athlete_id, referee_id, settings, status
    ) values (
      v_match, v_tournament, v_category, 'Kumite', p_round,
      v_lower.athlete_id, v_upper.athlete_id, auth.uid(), p_settings, 'Scheduled'
    );
    update public.bracket_slots set match_id = v_match
      where id in (v_lower.id, v_upper.id);
  end if;

  return jsonb_build_object(
    'matchId', v_match,
    'akaAthleteId', v_lower.athlete_id,
    'aoAthleteId', v_upper.athlete_id,
    'tournamentId', v_tournament,
    'categoryId', v_category,
    'reused', v_reused
  );
end;
$$;

revoke all on function public.start_bracket_match(uuid, int, int, jsonb) from public, anon;
grant execute on function public.start_bracket_match(uuid, int, int, jsonb) to authenticated;
