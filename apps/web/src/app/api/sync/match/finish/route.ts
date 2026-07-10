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
    target: e.target,
    technique: e.technique,
    penaltyReason: e.penaltyReason,
    occurredAtMs: e.occurredAtMs,
    remainingMs: e.remainingMs,
  }));
  const elapsedMs =
    Date.parse(payload.endedAt) - Date.parse(payload.startedAt);
  const outcome = evaluateMatch({
    events: domainEvents,
    settings: payload.settings,
    elapsedMs: Math.max(elapsedMs, payload.settings.durationSec * 1000),
    senshuHolder: payload.result.senshuHolder,
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

  // 2. Persist atomically via the finish_match RPC: match + events insert,
  //    bracket winner advancement, and stats refresh all in one transaction.
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
    settings: payload.settings,
  };
  const eventRows = payload.events.map((e) => ({
    id: e.id,
    match_id: e.matchId,
    side: e.side,
    kind: e.kind,
    target: e.target ?? null,
    technique: e.technique ?? null,
    penalty_reason: e.penaltyReason ?? null,
    occurred_at_ms: e.occurredAtMs,
    remaining_ms: e.remainingMs,
  }));

  const { data, error: rpcErr } = await supabase.rpc('finish_match', {
    p_match: matchRow,
    p_events: eventRows,
  });
  if (rpcErr) {
    if (rpcErr.code === '23505') {
      return conflict('Match already exists with different content', rpcErr.message);
    }
    return serverError('Failed to finish match', rpcErr.message);
  }

  const result = data as {
    matchId: string;
    status: 'created' | 'duplicate';
    serverWinnerId: string | null;
    serverReason: SyncMatchFinishResponse['serverReason'];
  };
  const response: SyncMatchFinishResponse = {
    matchId: result.matchId,
    status: result.status,
    serverWinnerId: result.serverWinnerId,
    serverReason: result.serverReason ?? payload.result.reason,
  };
  return NextResponse.json(response, { status: result.status === 'duplicate' ? 200 : 201 });
}
