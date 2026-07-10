import { NextResponse, type NextRequest } from 'next/server';
import { UuidSchema } from '@karate/schemas';
import { withAuth } from '@/lib/auth';
import { badRequest, notFound, serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

export const GET = withAuth([], async (
  { supabase },
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const check = UuidSchema.safeParse(id);
  if (!check.success) return badRequest('id is not a valid UUID');

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, name, date, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (tErr) return serverError('Failed to load tournament', tErr.message);
  if (!tournament) return notFound('Tournament not found');

  const { data: categories, error: cErr } = await supabase
    .from('tournament_categories')
    .select('id, age_division, gender, weight_class, match_type')
    .eq('tournament_id', id);
  if (cErr) return serverError('Failed to load categories', cErr.message);

  if (!categories || categories.length === 0) {
    return NextResponse.json({ tournament, categories: [], bracket: null, slots: [], athletes: [] });
  }

  const categoryId = categories[0]!.id;
  const { data: bracket, error: bErr } = await supabase
    .from('brackets')
    .select('id, format, size, generated_at')
    .eq('category_id', categoryId)
    .maybeSingle();
  if (bErr) return serverError('Failed to load bracket', bErr.message);

  if (!bracket) {
    return NextResponse.json({ tournament, categories, bracket: null, slots: [], athletes: [] });
  }

  const { data: slots, error: sErr } = await supabase
    .from('bracket_slots')
    .select('id, round, position, athlete_id, match_id, advances_to_slot_id')
    .eq('bracket_id', bracket.id)
    .order('round', { ascending: true })
    .order('position', { ascending: true });
  if (sErr) return serverError('Failed to load slots', sErr.message);

  const athleteIds = (slots ?? []).map((s) => s.athlete_id).filter((v): v is string => v != null);
  const uniqueAthleteIds = [...new Set(athleteIds)];

  let athletes: { id: string; name: string; rank: string }[] = [];
  if (uniqueAthleteIds.length > 0) {
    const { data: ath, error: aErr } = await supabase
      .from('athletes')
      .select('id, name, rank')
      .in('id', uniqueAthleteIds);
    if (aErr) return serverError('Failed to load athletes', aErr.message);
    athletes = ath ?? [];
  }

  // Load any matches referenced from slots, for status display.
  const matchIds = (slots ?? []).map((s) => s.match_id).filter((v): v is string => v != null);
  let matches: { id: string; status: string; winner_id: string | null }[] = [];
  if (matchIds.length > 0) {
    const { data: m, error: mErr } = await supabase
      .from('matches')
      .select('id, status, winner_id')
      .in('id', matchIds);
    if (mErr) return serverError('Failed to load matches', mErr.message);
    matches = m ?? [];
  }

  return NextResponse.json({
    tournament,
    categories,
    bracket,
    slots: slots ?? [],
    athletes,
    matches,
  });
});
