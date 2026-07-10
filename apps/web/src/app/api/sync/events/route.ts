import { NextRequest, NextResponse } from 'next/server';
import { SyncEventsRequestSchema, type SyncEventsResponse } from '@karate/schemas';
import { getServerSupabase } from '@karate/db/server';
import { fromZodError, serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SyncEventsRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const { matchId, match, events } = parsed.data;
  const supabase = getServerSupabase();

  // 1. If match metadata was sent, upsert a minimal matches row so that
  //    scoring_events.match_id FK is satisfied. Existing matches are left alone.
  if (match) {
    const matchRow = {
      id: matchId,
      tournament_id: match.tournamentId,
      category_id: match.categoryId,
      type: match.type,
      round: match.round,
      tatami_no: match.tatamiNo,
      aka_athlete_id: match.akaAthleteId,
      ao_athlete_id: match.aoAthleteId,
      settings: match.settings,
      start_time: match.startedAt,
      status: 'Live' as const,
    };
    const { error: upsertErr } = await supabase
      .from('matches')
      .upsert(matchRow, { onConflict: 'id', ignoreDuplicates: true });
    if (upsertErr) return serverError('Failed to upsert match', upsertErr.message);
  }

  // 2. Look up which event IDs already exist to split accepted vs duplicate.
  const ids = events.map((e) => e.id);
  const { data: existing, error: selectErr } = await supabase
    .from('scoring_events')
    .select('id')
    .in('id', ids);

  if (selectErr) return serverError('Failed to query existing events', selectErr.message);

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const newEvents = events.filter((e) => !existingIds.has(e.id));

  if (newEvents.length > 0) {
    const rows = newEvents.map((e) => ({
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

    const { error: insertErr } = await supabase.from('scoring_events').insert(rows);
    if (insertErr) return serverError('Failed to insert events', insertErr.message);
  }

  const response: SyncEventsResponse = {
    matchId,
    acceptedEventIds: newEvents.map((e) => e.id),
    duplicateEventIds: [...existingIds],
  };
  return NextResponse.json(response, { status: newEvents.length > 0 ? 201 : 200 });
}
