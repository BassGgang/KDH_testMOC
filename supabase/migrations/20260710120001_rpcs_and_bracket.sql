-- =============================================================================
-- 0004_rpcs_and_bracket.sql
-- Transactional RPCs and bracket progression:
--   * finish_match(): atomic match + events insert, winner advancement, stats
--   * create_tournament(): atomic tournament + category + bracket + slots
--   * advance_winner(): wire a slot's match winner into the next round (+ BYE)
--   * refresh_athlete_stats(): recompute the athlete_stats_cache row
-- Re-points RLS to app_current_role() and grants execute on the RPCs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Re-point every RLS policy that referenced current_role() to the renamed
-- app_current_role(). Drop-and-recreate so the migration is idempotent.
-- -----------------------------------------------------------------------------
drop policy if exists profiles_operator_select_all on public.profiles;
create policy profiles_operator_select_all on public.profiles
  for select using (public.app_current_role() = 'operator');

drop policy if exists athletes_operator_select_all on public.athletes;
create policy athletes_operator_select_all on public.athletes
  for select using (public.app_current_role() = 'operator');

drop policy if exists athletes_self_insert on public.athletes;
create policy athletes_self_insert on public.athletes
  for insert with check (user_id = auth.uid() and public.app_current_role() = 'athlete');

drop policy if exists athlete_coach_operator_select_all on public.athlete_coach;
create policy athlete_coach_operator_select_all on public.athlete_coach
  for select using (public.app_current_role() = 'operator');

drop policy if exists tournaments_operator_write on public.tournaments;
create policy tournaments_operator_write on public.tournaments
  for all using (public.app_current_role() = 'operator')
  with check (public.app_current_role() = 'operator');

drop policy if exists tournament_categories_operator_write on public.tournament_categories;
create policy tournament_categories_operator_write on public.tournament_categories
  for all using (public.app_current_role() = 'operator')
  with check (public.app_current_role() = 'operator');

drop policy if exists brackets_operator_write on public.brackets;
create policy brackets_operator_write on public.brackets
  for all using (public.app_current_role() = 'operator')
  with check (public.app_current_role() = 'operator');

drop policy if exists bracket_slots_operator_write on public.bracket_slots;
create policy bracket_slots_operator_write on public.bracket_slots
  for all using (public.app_current_role() = 'operator')
  with check (public.app_current_role() = 'operator');

drop policy if exists matches_operator_select_all on public.matches;
create policy matches_operator_select_all on public.matches
  for select using (public.app_current_role() = 'operator');

drop policy if exists scoring_events_select on public.scoring_events;
create policy scoring_events_select on public.scoring_events
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = scoring_events.match_id
        and (
          public.app_current_role() = 'operator'
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

drop policy if exists athlete_stats_cache_select on public.athlete_stats_cache;
create policy athlete_stats_cache_select on public.athlete_stats_cache
  for select using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_stats_cache.athlete_id
        and (
          public.app_current_role() = 'operator'
          or a.user_id = auth.uid()
          or exists (
            select 1 from public.athlete_coach ac
            where ac.athlete_id = a.id and ac.coach_id = auth.uid()
          )
        )
    )
  );

-- Drop the old reserved-name function now that nothing references it.
drop function if exists public.current_role();

-- -----------------------------------------------------------------------------
-- refresh_athlete_stats(athlete): recompute the cache row from Completed matches.
-- Provisional formulas mirror packages/domain/analytics/stats.ts. Called after a
-- match finishes so /api/athletes/:id can read the cache instead of recomputing.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_athlete_stats(p_athlete_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_count int;
  v_total_min   numeric;
  v_own_pts     numeric;
  v_opp_pts     numeric;
  v_wins        int;
  v_attack      numeric;
  v_defense     numeric;
  v_win_rate    numeric;
begin
  with mine as (
    select
      m.id,
      case when m.aka_athlete_id = p_athlete_id then 'AKA' else 'AO' end as side,
      (coalesce((m.settings->>'durationSec')::numeric, 180)) / 60.0 as dur_min,
      m.winner_id,
      m.aka_athlete_id,
      m.ao_athlete_id
    from public.matches m
    where m.status = 'Completed'
      and (m.aka_athlete_id = p_athlete_id or m.ao_athlete_id = p_athlete_id)
  ),
  scored as (
    select
      mn.id,
      mn.side,
      mn.dur_min,
      (mn.winner_id = p_athlete_id) as is_win,
      coalesce(sum(case when se.side = mn.side then
        case se.kind when 'ippon' then 3 when 'waza_ari' then 2 when 'yuko' then 1 else 0 end
      end), 0) as own_pts,
      coalesce(sum(case when se.side <> mn.side then
        case se.kind when 'ippon' then 3 when 'waza_ari' then 2 when 'yuko' then 1 else 0 end
      end), 0) as opp_pts
    from mine mn
    left join public.scoring_events se on se.match_id = mn.id
    group by mn.id, mn.side, mn.dur_min, mn.winner_id
  )
  select
    count(*), coalesce(sum(dur_min), 0),
    coalesce(sum(own_pts), 0), coalesce(sum(opp_pts), 0),
    coalesce(sum(case when is_win then 1 else 0 end), 0)
  into v_match_count, v_total_min, v_own_pts, v_opp_pts, v_wins
  from scored;

  if v_match_count = 0 then
    delete from public.athlete_stats_cache where athlete_id = p_athlete_id;
    return;
  end if;

  v_attack   := least(100, greatest(0, (v_own_pts / greatest(v_total_min, 1e-6)) * 25));
  v_defense  := least(100, greatest(0, 100 - (v_opp_pts / greatest(v_total_min, 1e-6)) * 25));
  v_win_rate := least(100, greatest(0, (v_wins::numeric / v_match_count) * 100));

  insert into public.athlete_stats_cache
    (athlete_id, attack, defense, speed, stamina, win_rate, match_count, updated_at)
  values
    (p_athlete_id, round(v_attack, 2), round(v_defense, 2), 0, 0, round(v_win_rate, 2), v_match_count, now())
  on conflict (athlete_id) do update set
    attack = excluded.attack,
    defense = excluded.defense,
    win_rate = excluded.win_rate,
    match_count = excluded.match_count,
    updated_at = now();
end;
$$;

-- -----------------------------------------------------------------------------
-- advance_winner(match): propagate a finished match's winner into the next
-- round's slot. Idempotent: safe to call again for the same match.
-- -----------------------------------------------------------------------------
create or replace function public.advance_winner(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner uuid;
  v_slot   record;
  v_next   uuid;
begin
  select winner_id into v_winner from public.matches where id = p_match_id;
  if v_winner is null then
    return;                                             -- draw/hantei: no auto-advance
  end if;

  -- Each match is linked from one or two bracket slots (aka + ao seats). Any of
  -- them carries the same advances_to_slot_id; take the first.
  select bs.advances_to_slot_id into v_next
  from public.bracket_slots bs
  where bs.match_id = p_match_id and bs.advances_to_slot_id is not null
  limit 1;

  if v_next is null then
    return;                                             -- final round, nothing above
  end if;

  update public.bracket_slots
  set athlete_id = v_winner
  where id = v_next and athlete_id is distinct from v_winner;
end;
$$;

-- -----------------------------------------------------------------------------
-- finish_match(): atomic replacement for the /api/sync/match/finish body.
-- Inserts the match + its events in one transaction, advances the bracket, and
-- refreshes both athletes' stats. Idempotent on the match id.
-- -----------------------------------------------------------------------------
create or replace function public.finish_match(
  p_match     jsonb,   -- full matches row (snake_case keys)
  p_events    jsonb    -- array of scoring_events rows (snake_case keys)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid := (p_match->>'id')::uuid;
  v_existing public.matches%rowtype;
  v_aka uuid := nullif(p_match->>'aka_athlete_id', '')::uuid;
  v_ao  uuid := nullif(p_match->>'ao_athlete_id', '')::uuid;
  v_winner uuid := nullif(p_match->>'winner_id', '')::uuid;
  v_eff_aka uuid;   -- effective (stored) aka for validation
  v_eff_ao  uuid;
  v_saved  public.matches%rowtype;
begin
  select * into v_existing from public.matches where id = v_match_id;

  -- Already finalized: idempotent replay, return the stored result.
  if found and v_existing.status = 'Completed' then
    return jsonb_build_object(
      'matchId', v_match_id, 'status', 'duplicate',
      'serverWinnerId', v_existing.winner_id, 'serverReason', v_existing.win_reason
    );
  end if;

  -- Winner must be one of the match participants (or null for a draw/hantei).
  -- For a pre-existing bracket match the participants are the stored ones, which
  -- the client cannot override; for a standalone match they come from the input.
  v_eff_aka := coalesce(v_existing.aka_athlete_id, v_aka);
  v_eff_ao  := coalesce(v_existing.ao_athlete_id, v_ao);
  if v_winner is not null and v_winner is distinct from v_eff_aka
     and v_winner is distinct from v_eff_ao then
    raise exception 'winner_id % is not a participant (aka=%, ao=%)',
      v_winner, v_eff_aka, v_eff_ao using errcode = 'check_violation';
  end if;

  if found then
    -- Pre-existing bracket match (Scheduled/Live): finalize it in place.
    -- aka/ao are NOT overwritten from client input (bracket seeding is authoritative).
    update public.matches set
      winner_id     = v_winner,
      win_reason    = nullif(p_match->>'win_reason', ''),
      senshu_holder = nullif(p_match->>'senshu_holder', ''),
      start_time    = coalesce(nullif(p_match->>'start_time', '')::timestamptz, v_existing.start_time),
      end_time      = nullif(p_match->>'end_time', '')::timestamptz,
      status        = 'Completed',
      settings      = coalesce(p_match->'settings', v_existing.settings),
      finalized_at  = now()
    where id = v_match_id;
  else
    -- Standalone match (not from a bracket): insert fresh.
    insert into public.matches (
      id, tournament_id, category_id, type, round,
      aka_athlete_id, ao_athlete_id, winner_id, win_reason, senshu_holder,
      tatami_no, start_time, end_time, status, settings, finalized_at
    ) values (
      v_match_id,
      nullif(p_match->>'tournament_id', '')::uuid,
      nullif(p_match->>'category_id', '')::uuid,
      coalesce(p_match->>'type', 'Kumite'),
      (p_match->>'round')::int,
      v_aka, v_ao,
      v_winner,
      nullif(p_match->>'win_reason', ''),
      nullif(p_match->>'senshu_holder', ''),
      nullif(p_match->>'tatami_no', '')::int,
      nullif(p_match->>'start_time', '')::timestamptz,
      nullif(p_match->>'end_time', '')::timestamptz,
      'Completed',
      coalesce(p_match->'settings', '{}'::jsonb),
      now()
    );
  end if;

  insert into public.scoring_events (
    id, match_id, side, kind, target, technique, penalty_reason,
    occurred_at_ms, remaining_ms
  )
  select
    (e->>'id')::uuid, v_match_id, e->>'side', e->>'kind',
    nullif(e->>'target', ''), nullif(e->>'technique', ''), nullif(e->>'penalty_reason', ''),
    (e->>'occurred_at_ms')::int, coalesce((e->>'remaining_ms')::int, 0)
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) as e
  on conflict (id) do nothing;

  -- Propagate the winner into the next bracket round (slots were linked to this
  -- match by start-match; a standalone match has no linked slot and no-ops).
  perform public.advance_winner(v_match_id);

  -- Refresh stats for both participants (use effective, stored ids).
  if v_eff_aka is not null then perform public.refresh_athlete_stats(v_eff_aka); end if;
  if v_eff_ao  is not null then perform public.refresh_athlete_stats(v_eff_ao);  end if;

  -- Return the persisted row so server* fields reflect what was actually stored.
  select * into v_saved from public.matches where id = v_match_id;
  return jsonb_build_object(
    'matchId', v_match_id, 'status', 'created',
    'serverWinnerId', v_saved.winner_id, 'serverReason', v_saved.win_reason
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- create_tournament(): atomic tournament + category + bracket + slots. Resolves
-- advances_to_slot_id (the self-FK) after slots exist, and auto-fills BYE
-- winners into round 2. Slots arrive pre-computed from the domain layer.
-- -----------------------------------------------------------------------------
create or replace function public.create_tournament(
  p_name          text,
  p_date          date,
  p_age_division  text,
  p_gender        text,
  p_weight_class  text,
  p_size          int,
  p_slots         jsonb   -- [{round, position, athlete_id, advances_to_position}]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament uuid;
  v_category   uuid;
  v_bracket    uuid;
  v_slot       jsonb;
  v_round      int;
  v_max_round  int;
begin
  insert into public.tournaments (name, date, status)
  values (p_name, p_date, 'Ongoing')
  returning id into v_tournament;

  insert into public.tournament_categories
    (tournament_id, age_division, gender, weight_class, match_type)
  values (v_tournament, p_age_division, p_gender, p_weight_class, 'Kumite')
  returning id into v_category;

  insert into public.brackets (category_id, format, size)
  values (v_category, 'single_elim', p_size)
  returning id into v_bracket;

  -- Insert every slot first (advances_to_slot_id filled in a second pass).
  for v_slot in select * from jsonb_array_elements(p_slots) loop
    insert into public.bracket_slots (bracket_id, round, position, athlete_id)
    values (
      v_bracket,
      (v_slot->>'round')::int,
      (v_slot->>'position')::int,
      nullif(v_slot->>'athlete_id', '')::uuid
    );
  end loop;

  -- Resolve advances_to_position -> advances_to_slot_id.
  update public.bracket_slots child
  set advances_to_slot_id = parent.id
  from jsonb_array_elements(p_slots) s
  join public.bracket_slots parent
    on parent.bracket_id = v_bracket
   and parent.round = (s->>'round')::int + 1
   and parent.position = (s->>'advances_to_position')::int
  where child.bracket_id = v_bracket
    and child.round = (s->>'round')::int
    and child.position = (s->>'position')::int
    and s->>'advances_to_position' is not null;

  -- BYE auto-advance, propagated round by round.
  --
  -- A slot whose sibling (the other child of the same parent) will NEVER hold an
  -- athlete carries its athlete straight up to the parent. BYEs can chain: a slot
  -- that advances into round R may itself face a permanently-empty sibling there
  -- and must advance again, and so on (e.g. size > participants+1 leaves an entire
  -- sub-tree athlete-free, so one seed walks up several rounds unopposed).
  --
  -- The subtle part is "NEVER holds an athlete". A sibling that is merely empty
  -- right now is ambiguous: it could be awaiting a real (pending) match below, or
  -- it could be the root of a wholly athlete-free sub-tree. Only the latter is a
  -- BYE. So we first compute occupied_slots: every slot on the upward path of some
  -- round-1 athlete (recursive walk over advances_to_slot_id). A sibling that is
  -- not in that set has an empty sub-tree and is a permanent BYE.
  --
  -- occupied_slots is a static property of the round-1 seeding + fixed topology,
  -- independent of the fills we are about to make, so we compute it once. Then we
  -- settle one round at a time from the bottom up; iterating R = 1 .. max_round-1
  -- propagates a seed up through every round whose sibling sub-tree is empty.
  select max((s->>'round')::int) into v_max_round
  from jsonb_array_elements(p_slots) s;

  for v_round in 1 .. coalesce(v_max_round, 1) - 1 loop
    with recursive occupied_slots as (
      -- Round-1 slots that actually hold an athlete...
      select bs.id, bs.advances_to_slot_id
      from public.bracket_slots bs
      where bs.bracket_id = v_bracket
        and bs.round = 1
        and bs.athlete_id is not null
      union
      -- ...and every ancestor they advance into.
      select parent.id, parent.advances_to_slot_id
      from public.bracket_slots parent
      join occupied_slots os on os.advances_to_slot_id = parent.id
      where parent.bracket_id = v_bracket
    )
    update public.bracket_slots nxt
    set athlete_id = present.athlete_id
    from public.bracket_slots present
    where present.bracket_id = v_bracket
      and present.round = v_round
      and present.athlete_id is not null
      and present.advances_to_slot_id = nxt.id
      and nxt.athlete_id is null
      -- The sibling (other child of nxt) must have a wholly athlete-free sub-tree:
      -- no slot feeding into nxt, other than present, is in occupied_slots.
      and not exists (
        select 1 from public.bracket_slots sibling
        where sibling.bracket_id = v_bracket
          and sibling.advances_to_slot_id = nxt.id
          and sibling.id <> present.id
          and sibling.id in (select id from occupied_slots)
      );
  end loop;

  return jsonb_build_object('id', v_tournament);
end;
$$;

-- -----------------------------------------------------------------------------
-- Execute grants. The API calls these with the authenticated user's JWT
-- (authenticated role); SECURITY DEFINER runs the body as the owner. Callers
-- must still be operators for writes — enforced in the API layer (Phase 3).
-- -----------------------------------------------------------------------------
grant execute on function public.finish_match(jsonb, jsonb)                 to authenticated, service_role;
grant execute on function public.create_tournament(text, date, text, text, text, int, jsonb) to authenticated, service_role;
grant execute on function public.advance_winner(uuid)                       to authenticated, service_role;
grant execute on function public.refresh_athlete_stats(uuid)                to authenticated, service_role;
