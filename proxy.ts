/**
 * Clerk middleware proxy — session context and request-path stamping.
 *
 * **This file does not gate access.** It calls no `protect()` and declares no
 * public-route matcher: every request passes through. The comment here used to
 * claim it "protects every route", which is the kind of false assumption the
 * next unguarded route group gets built on.
 *
 * What it actually does: injects Clerk's session context, which
 * `lib/supabase/server.ts` reads via `auth()` to attach the session token to
 * every Supabase query — so RLS can make every authorization decision.
 *
 * The gate lives in `app/(dashboard)/layout.tsx`'s `requireAuthenticatedUser()`.
 * Coverage is complete today only because every data route happens to sit under
 * `(dashboard)`. A new route group outside it is unguarded until it adds its
 * own check. See CLAUDE.md "Auth chain".
 *
 * The `x-pathname` header injection is a Next.js App Router convention: route
 * segments can read `headers().get('x-pathname')` to learn the full request
 * path, which is otherwise unavailable in Server Components.
 */

import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (_auth, request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/(.*)',
    '/(api|trpc)(.*)',
  ],
};
