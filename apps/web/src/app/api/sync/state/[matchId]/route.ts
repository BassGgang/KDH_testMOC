import { NextRequest, NextResponse } from 'next/server';
import { UuidSchema } from '@karate/schemas';
import { getServerSupabase } from '@karate/db/server';
import { badRequest, notFound, serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const idCheck = UuidSchema.safeParse(matchId);
  if (!idCheck.success) return badRequest('matchId is not a valid UUID');

  const supabase = getServerSupabase();

  const [matchResult, eventsResult] = await Promise.all([
    supabase
      .from('matches')
      .select('id, status, winner_id, win_reason, senshu_holder, start_time, end_time, settings, finalized_at')
      .eq('id', matchId)
      .maybeSingle(),
    supabase
      .from('scoring_events')
      .select('id, side, kind, technique, occurred_at_ms')
      .eq('match_id', matchId)
      .order('occurred_at_ms', { ascending: true }),
  ]);

  if (matchResult.error) return serverError('Failed to query match', matchResult.error.message);
  if (eventsResult.error) return serverError('Failed to query events', eventsResult.error.message);
  if (!matchResult.data) return notFound('Match not found');

  return NextResponse.json(
    {
      match: matchResult.data,
      events: eventsResult.data ?? [],
    },
    { status: 200 },
  );
}
