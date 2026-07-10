import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase session on every request and gates the app behind
 * authentication. Unauthenticated users are redirected to /login (for pages)
 * or rejected (for /api). /login and /auth/* stay public.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          for (const { name, value } of toSet) req.cookies.set(name, value);
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of toSet) res.cookies.set(name, value, options as never);
        },
      },
    },
  );

  // getUser() verifies the JWT and refreshes the session cookie if needed.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth');
  const isApi = pathname.startsWith('/api');

  if (!user && !isAuthRoute) {
    if (isApi) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 },
      );
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed-in users shouldn't sit on the login page.
  if (user && pathname === '/login') {
    const home = req.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return res;
}

export const config = {
  // Run on everything except Next internals, the PWA manifest/service worker,
  // and any icon/image asset (all .svg and .png, so icon-maskable.svg is exempt
  // too — otherwise the install-time icon would 302 to /login when signed out).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|svg|ico|webp)$).*)',
  ],
};
