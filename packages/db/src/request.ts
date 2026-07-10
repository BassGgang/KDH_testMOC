import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal cookie accessor, structurally compatible with Next.js `cookies()`.
 * Kept generic so this package doesn't hard-depend on next/headers.
 */
export interface CookieStore {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
}

/**
 * Request-scoped Supabase client bound to the caller's session cookies. Runs
 * every query under the authenticated user's JWT, so RLS is enforced — this is
 * the client API routes should use for reads and for user-scoped writes.
 *
 * Never falls back to the service_role key.
 */
export function getRequestSupabase(cookies: CookieStore): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        for (const { name, value, options } of toSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}
