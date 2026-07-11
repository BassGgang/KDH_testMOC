import { NextResponse, type NextRequest } from 'next/server';
import { StartBracketMatchRequestSchema } from '@karate/schemas';
import { withAuth } from '@/lib/auth';
import { badRequest, fromZodError, serverError } from '@/lib/api/errors';

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
// Only operators may start bracket matches. Direct table writes use
// service_role because matches/bracket_slots have no INSERT/UPDATE RLS policy.
export const POST = withAuth(['operator'], async ({ supabase }, req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = StartBracketMatchRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const { bracketId, round, position } = parsed.data;
  if (position % 2 !== 0) {
    return badRequest('position must be the lower (even) slot in the pair');
  }

  const { data, error } = await supabase.rpc('start_bracket_match', {
    p_bracket_id: bracketId,
    p_round: round,
    p_position: position,
    p_settings: DEFAULT_SETTINGS,
  });
  if (error) return serverError('Failed to start bracket match', error.message);

  const result = data as {
    matchId: string;
    akaAthleteId: string;
    aoAthleteId: string;
    tournamentId: string;
    categoryId: string;
    reused: boolean;
  };
  return NextResponse.json(result, { status: result.reused ? 200 : 201 });
});
