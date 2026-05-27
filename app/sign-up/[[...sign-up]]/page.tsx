import { SignUp } from '@clerk/nextjs';

/**
 * Sign-up page.
 *
 * The catch-all segment `[[...sign-up]]` lets Clerk handle every sub-path
 * needed for its hosted sign-up flow (e.g. /sign-up/verify-email-address).
 *
 * DOCS: https://clerk.com/docs/references/nextjs/custom-sign-in-or-up-page
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <SignUp />
    </main>
  );
}
