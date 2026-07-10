import { NextResponse, type NextRequest } from 'next/server';
import { generateSingleElimBracket } from '@karate/domain';
import { CreateTournamentRequestSchema } from '@karate/schemas';
import { withAuth } from '@/lib/auth';
import { fromZodError, serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

// Any authenticated user may browse the tournament list.
export const GET = withAuth([], async ({ supabase }) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, date, status, created_at')
    .order('date', { ascending: false });
  if (error) return serverError('Failed to list tournaments', error.message);
  return NextResponse.json({ tournaments: data ?? [] });
});

// Only operators may create tournaments.
export const POST = withAuth(['operator'], async ({ supabase }, req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateTournamentRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, date, ageDivision, gender, weightClass, athleteIds } = parsed.data;

  // Build the bracket in the domain layer, then persist the whole tournament
  // (tournament + category + bracket + slots + BYE advancement) atomically via
  // the create_tournament RPC.
  const bracketPlan = generateSingleElimBracket(athleteIds);
  const slots = bracketPlan.slots.map((s) => ({
    round: s.round,
    position: s.position,
    athlete_id: s.athleteId,
    advances_to_position: s.advancesToPosition,
  }));

  const { data, error } = await supabase.rpc('create_tournament', {
    p_name: name,
    p_date: date,
    p_age_division: ageDivision,
    p_gender: gender,
    p_weight_class: weightClass,
    p_size: bracketPlan.size,
    p_slots: slots,
  });
  if (error) return serverError('Failed to create tournament', error.message);

  const result = data as { id: string };
  return NextResponse.json({ id: result.id }, { status: 201 });
});
