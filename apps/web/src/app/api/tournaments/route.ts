import { NextResponse, type NextRequest } from 'next/server';
import { generateSingleElimBracket } from '@karate/domain';
import { CreateTournamentRequestSchema } from '@karate/schemas';
import { getServerSupabase } from '@karate/db/server';
import { fromZodError, serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, date, status, created_at')
    .order('date', { ascending: false });
  if (error) return serverError('Failed to list tournaments', error.message);
  return NextResponse.json({ tournaments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateTournamentRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, date, ageDivision, gender, weightClass, athleteIds } = parsed.data;

  const supabase = getServerSupabase();

  // 1. tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({ name, date, status: 'Ongoing' })
    .select('id')
    .single();
  if (tErr || !tournament) return serverError('Failed to create tournament', tErr?.message);

  // 2. one category (MVP simplification: one category per tournament)
  const { data: category, error: cErr } = await supabase
    .from('tournament_categories')
    .insert({
      tournament_id: tournament.id,
      age_division: ageDivision,
      gender,
      weight_class: weightClass,
      match_type: 'Kumite',
    })
    .select('id')
    .single();
  if (cErr || !category) return serverError('Failed to create category', cErr?.message);

  // 3. bracket
  const bracketPlan = generateSingleElimBracket(athleteIds);
  const { data: bracket, error: bErr } = await supabase
    .from('brackets')
    .insert({
      category_id: category.id,
      format: 'single_elim',
      size: bracketPlan.size,
    })
    .select('id')
    .single();
  if (bErr || !bracket) return serverError('Failed to create bracket', bErr?.message);

  // 4. bracket_slots
  const slotRows = bracketPlan.slots.map((s) => ({
    bracket_id: bracket.id,
    round: s.round,
    position: s.position,
    athlete_id: s.athleteId,
    match_id: null,
  }));
  const { error: sErr } = await supabase.from('bracket_slots').insert(slotRows);
  if (sErr) return serverError('Failed to create bracket slots', sErr.message);

  return NextResponse.json({ id: tournament.id }, { status: 201 });
}
