'use client';

/**
 * Sign-in page — Clerk prebuilt <SignIn> branded with the TCS design system
 * via the shared `appearance` config (lib/clerkAppearance).
 *
 * Methods (configured in the Clerk dashboard): email + password, Google OAuth.
 * The `[[...sign-in]]` catch-all is required so Clerk can handle its own
 * sub-paths mid-flow (verification, SSO callback).
 */

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { clerkAppearance } from '@/lib/clerkAppearance';

export default function SignInPage() {
  const reason = useSearchParams().get('reason');

  return (
    <main className="auth-shell">
      <div className="auth-stack">
        <div className="auth-brand">TVI-CAMS · Compliance &amp; Audit</div>
        {reason === 'auth-required' && (
          <p className="auth-global-error">Please sign in to continue.</p>
        )}
        <SignIn
          appearance={clerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      </div>
    </main>
  );
}
