'use client';

/**
 * Sign-up page — Clerk prebuilt <SignUp> branded with the TCS design system
 * via the shared `appearance` config (lib/clerkAppearance).
 *
 * Methods (configured in the Clerk dashboard): email + password (with email
 * verification code), Google OAuth. The `[[...sign-up]]` catch-all is required
 * so Clerk can handle its own sub-paths mid-flow (verify-email, SSO callback).
 */

import { SignUp } from '@clerk/nextjs';
import { clerkAppearance } from '@/modules/auth/ui/clerkAppearance';

export default function SignUpPage() {
  return (
    <main className="auth-shell">
      <div className="auth-stack">
        <div className="auth-brand">TVI-CAMS · Compliance &amp; Audit</div>
        <SignUp
          appearance={clerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </div>
    </main>
  );
}
