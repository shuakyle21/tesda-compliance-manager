/**
 * Sign-in route guard — Server Component.
 *
 * Clerk rejects a new sign-in attempt (`POST /client/sign_ins` → 400) when a
 * session is already active for the client — Clerk defaults to single-session
 * mode. If an already-authenticated user lands on /sign-in (stale tab,
 * bookmark, or a race in an earlier auth check) and clicks "Continue with
 * Google" or submits the form, that 400 is what they hit — `sign-in-page.tsx`
 * has no way to distinguish it from a real auth failure, so it just surfaces
 * the raw Clerk error.
 *
 * Guard at the layout level (a Server Component, so `getAuthUserId()` reads
 * the real Clerk session before the page ever renders) and redirect an
 * already-signed-in visitor straight into the app instead of rendering the
 * sign-in form at all. The one path this must NOT catch is the OAuth return
 * leg (/sign-in/sso-callback) — the session isn't active yet there (`setActive`
 * hasn't run inside `AuthenticateWithRedirectCallback`), and redirecting away
 * mid-handshake would strand the callback. `proxy.ts` forwards the request
 * path as the `x-pathname` header for exactly this kind of path-scoped
 * decision — same pattern as `app/(dashboard)/layout.tsx`'s trainer check.
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthUserId } from '@/modules/auth/data/auth';

export default async function SignInLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isSsoCallback = pathname.includes('/sso-callback');

  if (!isSsoCallback) {
    const userId = await getAuthUserId();
    if (userId) redirect('/');
  }

  return <>{children}</>;
}
