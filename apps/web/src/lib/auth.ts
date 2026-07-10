import { cookies } from 'next/headers';
import { getRequestSupabase } from '@karate/db/request';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'operator' | 'coach' | 'athlete';

export interface AuthedUser {
  id: string;
  email: string | null;
  role: Role;
}

export interface AuthContext {
  user: AuthedUser;
  /** RLS-scoped client bound to this user's session. */
  supabase: SupabaseClient;
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Resolve the authenticated user for an API route, or throw AuthError(401).
 * Uses getUser() (which verifies the JWT with the auth server) rather than
 * trusting the cookie session blindly.
 */
export async function requireUser(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const supabase = getRequestSupabase(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError(401, 'Authentication required');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role ?? 'athlete') as Role;
  return {
    user: { id: user.id, email: user.email ?? null, role },
    supabase,
  };
}

/** Require the user to hold one of the given roles, or throw AuthError(403). */
export async function requireRole(...roles: Role[]): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!roles.includes(ctx.user.role)) {
    throw new AuthError(403, `Requires role: ${roles.join(' or ')}`);
  }
  return ctx;
}

import { NextResponse } from 'next/server';

/**
 * Wrap a route handler so AuthError is turned into a 401/403 response instead of
 * a 500. The handler receives the resolved AuthContext.
 *
 *   export const POST = withAuth(['operator'], async (ctx, req) => { ... });
 *
 * Pass an empty roles array to require only authentication.
 */
export function withAuth<Args extends unknown[]>(
  roles: Role[],
  handler: (ctx: AuthContext, ...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    let ctx: AuthContext;
    try {
      ctx = roles.length ? await requireRole(...roles) : await requireUser();
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.status === 401 ? 'unauthorized' : 'forbidden', message: err.message },
          { status: err.status },
        );
      }
      throw err;
    }
    return handler(ctx, ...args);
  };
}
