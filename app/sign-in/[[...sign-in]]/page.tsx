'use client';

/**
 * Sign-in route.
 *
 * Renders the custom <SignInCard> (sign-in-page.tsx) inside the branded auth
 * shell. Because the route is a `[[...sign-in]]` catch-all, it also receives the
 * Google OAuth return at `/sign-in/sso-callback`; on that sub-path we render
 * Clerk's <AuthenticateWithRedirectCallback /> to finish the handshake and
 * activate the session before redirecting on.
 */

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { SignInCard } from './sign-in-page';

export default function SignInPage() {
  const pathname = usePathname();

  if (pathname?.includes('/sso-callback')) {
    return (
      <main className="auth-shell">
        <AuthenticateWithRedirectCallback
          signInUrl="/sign-in"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        />
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-stack">
        <SignInCard />
      </div>
    </main>
  );
}
