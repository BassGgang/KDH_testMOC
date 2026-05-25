import { NextResponse } from 'next/server';
import { getServerSupabase } from '@karate/db/server';
import { serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('athletes')
    .select('id, name, rank, affiliation, gender, weight_kg, created_at')
    .order('name', { ascending: true });

  if (error) return serverError('Failed to list athletes', error.message);

  return NextResponse.json({
    athletes: (data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      rank: a.rank,
      affiliation: a.affiliation,
      gender: a.gender,
      weightKg: a.weight_kg,
    })),
  });
}
