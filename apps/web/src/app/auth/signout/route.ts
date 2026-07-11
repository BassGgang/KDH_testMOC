import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequestSupabase } from '@karate/db/request';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = getRequestSupabase(await cookies());
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ error: 'signout_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
