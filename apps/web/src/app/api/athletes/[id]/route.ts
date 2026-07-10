import { NextResponse, type NextRequest } from 'next/server';
import {
  computeAthleteStats, summarizeMatch,
  type MatchSummary, type ScoringEvent, type ScoringEventKind, type Side,
} from '@karate/domain';
import { UuidSchema } from '@karate/schemas';
import { withAuth } from '@/lib/auth';
import { badRequest, notFound, serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

interface MatchRow {
  id: string;
  type: string;
  round: number;
  aka_athlete_id: string | null;
  ao_athlete_id: string | null;
  winner_id: string | null;
  start_time: string | null;
  end_time: string | null;
  settings: { durationSec: number; targetScore: number; pointGap: number; senshuEnabled: boolean };
}

interface EventRow {
  id: string;
  match_id: string;
  side: Side;
  kind: ScoringEventKind;
  target: 'jodan' | 'chudan' | null;
  technique: 'tsuki' | 'keri' | null;
  penalty_reason: string | null;
  occurred_at_ms: number;
  remaining_ms: number;
}

export const GET = withAuth([], async (
  { supabase },
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const check = UuidSchema.safeParse(id);
  if (!check.success) return badRequest('id is not a valid UUID');

  const { data: athlete, error: athleteErr } = await supabase
    .from('athletes')
    .select('id, name, rank, affiliation, gender, weight_kg, birth_date')
    .eq('id', id)
    .maybeSingle();

  if (athleteErr) return serverError('Failed to load athlete', athleteErr.message);
  if (!athlete) return notFound('Athlete not found');

  const { data: matches, error: matchesErr } = await supabase
    .from('matches')
    .select('id, type, round, aka_athlete_id, ao_athlete_id, winner_id, start_time, end_time, settings')
    .or(`aka_athlete_id.eq.${id},ao_athlete_id.eq.${id}`)
    .eq('status', 'Completed')
    .order('end_time', { ascending: false })
    .limit(50);

  if (matchesErr) return serverError('Failed to load matches', matchesErr.message);

  const matchIds = (matches ?? []).map((m) => m.id);
  let eventsByMatch = new Map<string, ScoringEvent[]>();
  let opponentNames = new Map<string, string>();

  if (matchIds.length > 0) {
    const [eventsRes, opponentsRes] = await Promise.all([
      supabase
        .from('scoring_events')
        .select('id, match_id, side, kind, target, technique, penalty_reason, occurred_at_ms, remaining_ms')
        .in('match_id', matchIds),
      supabase
        .from('athletes')
        .select('id, name')
        .in(
          'id',
          (matches as MatchRow[])
            .map((m) => (m.aka_athlete_id === id ? m.ao_athlete_id : m.aka_athlete_id))
            .filter((v): v is string => v != null),
        ),
    ]);

    if (eventsRes.error) return serverError('Failed to load events', eventsRes.error.message);
    if (opponentsRes.error) return serverError('Failed to load opponents', opponentsRes.error.message);

    for (const row of (eventsRes.data ?? []) as EventRow[]) {
      const list = eventsByMatch.get(row.match_id) ?? [];
      list.push({
        id: row.id,
        matchId: row.match_id,
        side: row.side,
        kind: row.kind,
        target: row.target ?? undefined,
        technique: row.technique ?? undefined,
        penaltyReason: (row.penalty_reason ?? undefined) as ScoringEvent['penaltyReason'],
        occurredAtMs: row.occurred_at_ms,
        remainingMs: row.remaining_ms,
      });
      eventsByMatch.set(row.match_id, list);
    }
    for (const a of opponentsRes.data ?? []) {
      opponentNames.set(a.id, a.name);
    }
  }

  // Build summaries for stats computation.
  const summaries: MatchSummary[] = (matches as MatchRow[] ?? []).map((m) => {
    const side: Side = m.aka_athlete_id === id ? 'AKA' : 'AO';
    const winnerSide: Side | null =
      m.winner_id == null ? null :
      m.winner_id === m.aka_athlete_id ? 'AKA' :
      m.winner_id === m.ao_athlete_id ? 'AO' : null;
    return summarizeMatch({
      matchId: m.id,
      side,
      events: eventsByMatch.get(m.id) ?? [],
      durationSec: m.settings.durationSec,
      winnerSide,
    });
  });

  const stats = computeAthleteStats(summaries);

  // Build display-friendly history.
  const history = (matches as MatchRow[] ?? []).map((m) => {
    const side: Side = m.aka_athlete_id === id ? 'AKA' : 'AO';
    const opponentId = side === 'AKA' ? m.ao_athlete_id : m.aka_athlete_id;
    const opponentName = opponentId ? (opponentNames.get(opponentId) ?? '不明') : '不明';
    const summary = summaries.find((s) => s.matchId === m.id);
    return {
      matchId: m.id,
      date: m.end_time ?? m.start_time ?? null,
      round: m.round,
      isWin: summary?.isWin ?? false,
      ownScore: summary?.ownScore ?? 0,
      opponentScore: summary?.opponentScore ?? 0,
      opponentName,
    };
  });

  return NextResponse.json({
    id: athlete.id,
    name: athlete.name,
    rank: athlete.rank,
    affiliation: athlete.affiliation,
    gender: athlete.gender,
    weightKg: athlete.weight_kg,
    birthDate: athlete.birth_date,
    stats,
    history,
  });
});
