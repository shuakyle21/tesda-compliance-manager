/**
 * Clerk Middleware — Session Context + Pathname Forwarding
 *
 * `clerkMiddleware()` must run on every matched request for `auth()` /
 * `currentUser()` to work anywhere downstream (Server Components, Route
 * Handlers) — it populates Clerk's request-scoped session context even
 * though this file no longer enforces route protection itself.
 *
 * Route protection used to live here via `createRouteMatcher` +
 * `auth.protect()`, but that API is deprecated in `@clerk/nextjs` (removed
 * in the next major version). Per Clerk's guidance, auth checks now live in
 * each protected page/layout/route handler instead — see
 * `requireAuthenticatedUser()` in `modules/auth/data/auth.ts`, called from
 * `app/(dashboard)/layout.tsx` and `app/api-docs/page.tsx`, and the inline
 * check in `app/api/openapi.json/route.ts`.
 * Migration guide: https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher
 *
 * The `/__clerk/(.*)` matcher entry is required so Clerk's auto-proxy path
 * is always routed through this middleware correctly.
 *
 * Forwards the request pathname as `x-pathname` so Server Component
 * layouts — which Next.js does not hand `searchParams` and has no other way
 * to read the current path from — can make path-scoped rendering decisions
 * (see `app/(dashboard)/layout.tsx`, which uses it to keep billing figures
 * off the trainer-only route tree per the CLAUDE.md role rules).
 *
 * DOCS: https://clerk.com/docs/references/nextjs/clerk-middleware
 */

import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (_auth, request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  // Turbopack (Next 16) requires every matcher entry to be a static string
  // literal, so the asset-skip pattern is inlined here rather than referenced
  // via a const. Matches every request except Next internals + static assets.
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path.
    '/__clerk/(.*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
