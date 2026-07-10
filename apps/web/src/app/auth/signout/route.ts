import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequestSupabase } from '@karate/db/request';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = getRequestSupabase(await cookies());
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
