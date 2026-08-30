/**
 * Pure orchestration for starting a Google OAuth sign-in attempt.
 *
 * Takes a minimal, Clerk-shaped `signIn` dependency rather than importing
 * `useSignIn()` directly, so this can be unit-tested with a fake object
 * instead of a real Clerk client.
 */

export type OAuthCapableSignIn = {
  status: string | null;
  reset: () => Promise<{ error?: unknown }>;
  sso: (opts: {
    strategy: 'oauth_google';
    redirectCallbackUrl: string;
    redirectUrl: string;
    oidcPrompt?: string;
  }) => Promise<{ error?: unknown }>;
};

/**
 * A stale `status` from an earlier abandoned attempt (e.g. a client-trust
 * challenge the user backed out of) must be fully cleared — and awaited —
 * before starting a new `sso()` call. `sso()` silently declines to start a
 * new attempt if it sees a non-empty status, with no error surfaced.
 */
export async function startGoogleSignIn(
  signIn: OAuthCapableSignIn,
  redirectUrl: string,
): Promise<{ error?: unknown }> {
  if (signIn.status) {
    await signIn.reset();
  }
  return signIn.sso({
    strategy: 'oauth_google',
    redirectCallbackUrl: '/sign-in/sso-callback',
    redirectUrl,
    oidcPrompt: 'select_account',
  });
}
