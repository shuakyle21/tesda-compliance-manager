/**
 * Clerk Middleware — Route Protection
 *
 * `clerkMiddleware()` runs on every matched request and enforces auth.
 * Public routes (sign-in, sign-up) are allowlisted via `createRouteMatcher`
 * so unauthenticated users can reach them; every other route requires a
 * valid Clerk session and redirects to /sign-in otherwise.
 *
 * The `/__clerk/(.*)` matcher entry is required so Clerk's auto-proxy path
 * is always routed through this middleware correctly.
 *
 * DOCS: https://clerk.com/docs/references/nextjs/clerk-middleware
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/** Routes that do NOT require authentication. */
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Explicitly redirect to /sign-in so the destination is predictable
    // regardless of the Clerk dashboard's "Sign-in URL" setting.
    // `unauthenticatedUrl` must be an ABSOLUTE URL — Next.js middleware
    // rejects relative paths — so resolve it against the request origin.
    const signInUrl = new URL('/sign-in', request.url);
    await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
  }
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
