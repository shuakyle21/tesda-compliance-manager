import { describe, it, expect } from 'vitest';
import { startGoogleSignIn, type OAuthCapableSignIn } from '@/modules/auth/domain/oauthSignIn';

function delay<T>(value: T, ms = 10): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Mimics the real bug mechanism, not just call order: `status` is a mutable
 * field that `reset()` only clears once its (delayed) promise resolves.
 * `sso()` records what `status` looked like *at the moment it ran* — if the
 * caller forgot to `await reset()`, `sso()` will see the stale status still
 * sitting there, exactly like the real Clerk client did.
 */
function makeFakeSignIn(initialStatus: string | null): {
  signIn: OAuthCapableSignIn;
  statusWhenSsoRan: (string | null)[];
} {
  const state = { status: initialStatus };
  const statusWhenSsoRan: (string | null)[] = [];

  const signIn: OAuthCapableSignIn = {
    get status() {
      return state.status;
    },
    reset: async () => {
      await delay(undefined);
      state.status = null;
      return { error: undefined };
    },
    sso: async (opts) => {
      statusWhenSsoRan.push(state.status);
      void opts;
      return { error: undefined };
    },
  };

  return { signIn, statusWhenSsoRan };
}

describe('startGoogleSignIn', () => {
  it('awaits reset() before calling sso(), when a stale status exists', async () => {
    const { signIn, statusWhenSsoRan } = makeFakeSignIn('needs_client_trust');

    await startGoogleSignIn(signIn, '/dashboard');

    // If reset() weren't awaited, sso() would run while status was still
    // 'needs_client_trust' — this is what actually failed in production.
    expect(statusWhenSsoRan).toEqual([null]);
  });

  it('skips reset() when there is no stale status', async () => {
    let resetCalls = 0;
    let ssoCalls = 0;
    const signIn: OAuthCapableSignIn = {
      status: null,
      reset: async () => {
        resetCalls += 1;
        return { error: undefined };
      },
      sso: async () => {
        ssoCalls += 1;
        return { error: undefined };
      },
    };

    await startGoogleSignIn(signIn, '/dashboard');

    expect(resetCalls).toBe(0);
    expect(ssoCalls).toBe(1);
  });

  it('passes oidcPrompt: "select_account" to sso()', async () => {
    let ssoArgs: Record<string, unknown> | undefined;
    const signIn: OAuthCapableSignIn = {
      status: null,
      reset: async () => ({ error: undefined }),
      sso: async (opts) => {
        ssoArgs = opts;
        return { error: undefined };
      },
    };

    await startGoogleSignIn(signIn, '/dashboard');

    expect(ssoArgs).toMatchObject({
      strategy: 'oauth_google',
      redirectCallbackUrl: '/sign-in/sso-callback',
      redirectUrl: '/dashboard',
      oidcPrompt: 'select_account',
    });
  });

  it('propagates an error returned by sso()', async () => {
    const boom = { message: 'network error' };
    const signIn: OAuthCapableSignIn = {
      status: null,
      reset: async () => ({ error: undefined }),
      sso: async () => ({ error: boom }),
    };

    const result = await startGoogleSignIn(signIn, '/dashboard');

    expect(result.error).toBe(boom);
  });
});
