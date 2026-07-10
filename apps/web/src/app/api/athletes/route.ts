import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { serverError } from '@/lib/api/errors';

export const runtime = 'nodejs';

// Reads through the RLS-scoped client: operators see all, coaches see their
// athletes, athletes see themselves (enforced by policy, not the app layer).
export const GET = withAuth([], async ({ supabase }) => {
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
});
