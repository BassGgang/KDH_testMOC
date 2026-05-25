import { NextRequest, NextResponse } from 'next/server';
import {
  SyncMatchFinishRequestSchema,
  type SyncMatchFinishResponse,
} from '@karate/schemas';
import { evaluateMatch, type ScoringEvent } from '@karate/domain';
import { getServerSupabase } from '@karate/db/server';
import { conflict, fromZodError, serverError, unprocessable } from '@/lib/api/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SyncMatchFinishRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const payload = parsed.data;
  const supabase = getServerSupabase();

  // 1. Re-run the domain rules with the submitted events to verify the client's
  //    claimed result. The match has by definition reached an end-state, so we
  //    evaluate as if time has elapsed past the duration.
  const domainEvents: ScoringEvent[] = payload.events.map((e) => ({
    id: e.id,
    matchId: e.matchId,
    side: e.side,
    kind: e.kind,
    technique: e.technique,
    occurredAtMs: e.occurredAtMs,
  }));
  const elapsedMs =
    Date.parse(payload.endedAt) - Date.parse(payload.startedAt);
  const outcome = evaluateMatch({
    events: domainEvents,
    settings: payload.settings,
    elapsedMs: Math.max(elapsedMs, payload.settings.durationSec * 1000),
  });

  // We accept hantei_required matches as long as the client supplied a winner
  // (representing the judges' decision). For 'decided' outcomes we require the
  // client's claim to match.
  if (outcome.status === 'decided') {
    const expectedWinnerSide = outcome.winnerId; // 'AKA' | 'AO' | null
    const expectedAthleteId =
      expectedWinnerSide === 'AKA' ? payload.aka.athleteId
      : expectedWinnerSide === 'AO' ? payload.ao.athleteId
      : null;
    if (expectedAthleteId !== payload.result.winnerId) {
      return unprocessable('Submitted winner disagrees with re-computed result', {
        expected: expectedAthleteId,
        submitted: payload.result.winnerId,
        reason: outcome.reason,
      });
    }
  }

  // 2. Check for an existing match with this ID (idempotency).
  const { data: existing, error: selectErr } = await supabase
    .from('matches')
    .select('id, winner_id, win_reason')
    .eq('id', payload.matchId)
    .maybeSingle();
  if (selectErr) return serverError('Failed to query match', selectErr.message);

  if (existing) {
    // Idempotent replay: return the stored result.
    const response: SyncMatchFinishResponse = {
      matchId: payload.matchId,
      status: 'duplicate',
      serverWinnerId: existing.winner_id,
      serverReason: existing.win_reason,
    };
    return NextResponse.json(response, { status: 200 });
  }

  // 3. Insert match + events transactionally is hard via supabase-js. Insert
  //    match first, then events; on event insert failure, we rely on a manual
  //    cleanup TODO. (A SQL RPC would be cleaner; revisit in Step 7.)
  const matchRow = {
    id: payload.matchId,
    tournament_id: payload.tournamentId,
    category_id: payload.categoryId,
    type: payload.type,
    round: payload.round,
    aka_athlete_id: payload.aka.athleteId,
    ao_athlete_id: payload.ao.athleteId,
    winner_id: payload.result.winnerId,
    win_reason: payload.result.reason,
    senshu_holder: payload.result.senshuHolder,
    tatami_no: payload.tatamiNo,
    start_time: payload.startedAt,
    end_time: payload.endedAt,
    status: 'Completed' as const,
    settings: payload.settings,
    finalized_at: new Date().toISOString(),
  };

  const { error: insertMatchErr } = await supabase.from('matches').insert(matchRow);
  if (insertMatchErr) {
    if (insertMatchErr.code === '23505') {
      return conflict('Match already exists with different content', insertMatchErr.message);
    }
    return serverError('Failed to insert match', insertMatchErr.message);
  }

  // 4. Insert events, deduped against already-synced events.
  if (payload.events.length > 0) {
    const eventRows = payload.events.map((e) => ({
      id: e.id,
      match_id: e.matchId,
      side: e.side,
      kind: e.kind,
      technique: e.technique ?? null,
      occurred_at_ms: e.occurredAtMs,
    }));
    const { error: insertEventsErr } = await supabase
      .from('scoring_events')
      .upsert(eventRows, { onConflict: 'id', ignoreDuplicates: true });
    if (insertEventsErr) {
      return serverError('Failed to insert events', insertEventsErr.message);
    }
  }

  const response: SyncMatchFinishResponse = {
    matchId: payload.matchId,
    status: 'created',
    serverWinnerId: payload.result.winnerId,
    serverReason: payload.result.reason,
  };
  return NextResponse.json(response, { status: 201 });
}
