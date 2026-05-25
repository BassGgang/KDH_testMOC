import { NextResponse, type NextRequest } from 'next/server';
import { StartBracketMatchRequestSchema } from '@karate/schemas';
import { getServerSupabase } from '@karate/db/server';
import { badRequest, fromZodError, serverError, unprocessable } from '@/lib/api/errors';

export const runtime = 'nodejs';

const DEFAULT_SETTINGS = {
  durationSec: 180,
  targetScore: 8,
  pointGap: 8,
  senshuEnabled: true,
};

/**
 * Turn an adjacent pair of bracket slots in the same round into a Match.
 * The match_id is server-generated (UUID) so the client can then create a
 * local IndexedDB record with the same ID and start scoring.
 *
 * Request:
 *   { bracketId, round, position }  ← position is the even-indexed slot in the pair
 *
 * Response:
 *   { matchId, akaAthleteId, aoAthleteId, tournamentId, categoryId }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = StartBracketMatchRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const { bracketId, round, position } = parsed.data;
  if (position % 2 !== 0) {
    return badRequest('position must be the lower (even) slot in the pair');
  }

  const supabase = getServerSupabase();

  const { data: slots, error: slotsErr } = await supabase
    .from('bracket_slots')
    .select('id, athlete_id, match_id, round, position, bracket_id')
    .eq('bracket_id', bracketId)
    .in('position', [position, position + 1])
    .eq('round', round);
  if (slotsErr) return serverError('Failed to load slots', slotsErr.message);
  if (!slots || slots.length !== 2) {
    return unprocessable('Both slots in the pair must exist', { found: slots?.length ?? 0 });
  }

  const lower = slots.find((s) => s.position === position)!;
  const upper = slots.find((s) => s.position === position + 1)!;
  if (lower.athlete_id == null || upper.athlete_id == null) {
    return unprocessable('Both slots must have an athlete (BYE handling not yet implemented)');
  }
  if (lower.match_id && lower.match_id === upper.match_id) {
    // Match already started for this pair; return it for resumption.
    return NextResponse.json({
      matchId: lower.match_id,
      akaAthleteId: lower.athlete_id,
      aoAthleteId: upper.athlete_id,
      reused: true,
    });
  }

  // Find tournament and category via the bracket.
  const { data: bracket, error: bracketErr } = await supabase
    .from('brackets')
    .select('id, category_id, tournament_categories!inner(id, tournament_id)')
    .eq('id', bracketId)
    .single();
  if (bracketErr || !bracket) return serverError('Failed to load bracket context', bracketErr?.message);

  // @ts-expect-error supabase typed any
  const tournamentId = bracket.tournament_categories.tournament_id as string;
  const categoryId = bracket.category_id as string;

  // Create the match row.
  const matchId = crypto.randomUUID();
  const { error: insertErr } = await supabase.from('matches').insert({
    id: matchId,
    tournament_id: tournamentId,
    category_id: categoryId,
    type: 'Kumite',
    round,
    aka_athlete_id: lower.athlete_id,
    ao_athlete_id: upper.athlete_id,
    settings: DEFAULT_SETTINGS,
    status: 'Scheduled',
  });
  if (insertErr) return serverError('Failed to create match', insertErr.message);

  // Link both slots to the new match.
  const { error: linkErr } = await supabase
    .from('bracket_slots')
    .update({ match_id: matchId })
    .in('id', [lower.id, upper.id]);
  if (linkErr) return serverError('Failed to link slots to match', linkErr.message);

  return NextResponse.json({
    matchId,
    akaAthleteId: lower.athlete_id,
    aoAthleteId: upper.athlete_id,
    tournamentId,
    categoryId,
    reused: false,
  }, { status: 201 });
}
