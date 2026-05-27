import { SignIn } from '@clerk/nextjs';

/**
 * Sign-in page.
 *
 * The catch-all segment `[[...sign-in]]` lets Clerk handle every sub-path
 * needed for its hosted sign-in flow (e.g. /sign-in/factor-one, /sign-in/sso-callback).
 *
 * DOCS: https://clerk.com/docs/references/nextjs/custom-sign-in-or-up-page
 */
export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <SignIn />
    </main>
  );
}
