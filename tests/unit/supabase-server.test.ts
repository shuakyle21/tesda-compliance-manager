/**
 * Written against the FIXED behavior described in
 * docs/LIVE_DATA_MIGRATION_PLAN.md §4 Phase 1 step 3, not the current file.
 * Two of these will fail against today's `lib/supabase/server.ts` — that
 * failure is the point: it's a reproducible, automated proof of the A1/A10
 * findings (missing JWT template; a missing token silently degrading to an
 * unauthenticated `anon` request) before any code changes, and turns green
 * once `createSupabaseServerClient` switches to the `accessToken` callback
 * pattern and throws on a missing token instead of sending an empty header.
 *
 * `createClient` and Clerk's `auth` are mocked — this is a unit test of how
 * this file *decides* to call them, not an integration test against real
 * Supabase/Clerk (that's the manual `/api/debug/auth-check` check, and the
 * future RLS isolation tests CLAUDE.md calls for run against the real
 * project with no mocks).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  createClientMock.mockReset().mockReturnValue({ __fakeSupabaseClient: true });
  authMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('isSupabaseConfigured', () => {
  it('is true when both env vars are set', async () => {
    const { isSupabaseConfigured } = await import('@/lib/supabase/server');
    expect(isSupabaseConfigured()).toBe(true);
  });

  it.each([
    ['NEXT_PUBLIC_SUPABASE_URL'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  ])('is false when %s is missing', async (missingVar) => {
    delete process.env[missingVar];
    const { isSupabaseConfigured } = await import('@/lib/supabase/server');
    expect(isSupabaseConfigured()).toBe(false);
  });
});

describe('createSupabaseServerClient', () => {
  it('passes an accessToken callback, not a static Authorization header', async () => {
    authMock.mockResolvedValue({ getToken: vi.fn().mockResolvedValue('a-real-token') });

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    await createSupabaseServerClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    const [url, anonKey, options] = createClientMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co');
    expect(anonKey).toBe('anon-key');
    expect(typeof options.accessToken).toBe('function');
    expect(options.global?.headers?.Authorization).toBeUndefined();
    expect(options.auth).toEqual({
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    });
  });

  it("calls Clerk's getToken with no template argument", async () => {
    const getToken = vi.fn().mockResolvedValue('a-real-token');
    authMock.mockResolvedValue({ getToken });

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    await createSupabaseServerClient();
    const { accessToken } = createClientMock.mock.calls[0][2];
    await accessToken();

    // The whole point of the fix: no `{ template: 'supabase' }` — that
    // template doesn't exist in this project's Clerk instance (A1).
    expect(getToken).toHaveBeenCalledWith();
  });

  it('resolves the token when Clerk returns one', async () => {
    authMock.mockResolvedValue({ getToken: vi.fn().mockResolvedValue('a-real-token') });

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    await createSupabaseServerClient();
    const { accessToken } = createClientMock.mock.calls[0][2];

    await expect(accessToken()).resolves.toBe('a-real-token');
  });

  it('throws the exported sentinel, so callers can tell "not signed in" from "token rejected"', async () => {
    // These two failures look identical at the query site but mean opposite
    // things: one is "sign in", the other is "your Supabase dashboard is not
    // configured". /api/debug/auth-check matches on this exact constant, so
    // drifting the message silently turns that diagnostic into a liar.
    authMock.mockResolvedValue({ getToken: vi.fn().mockResolvedValue(null) });

    const { createSupabaseServerClient, NO_CLERK_TOKEN_MESSAGE } =
      await import('@/lib/supabase/server');
    await createSupabaseServerClient();
    const { accessToken } = createClientMock.mock.calls[0][2];

    await expect(accessToken()).rejects.toThrow(NO_CLERK_TOKEN_MESSAGE);
  });

  it('throws instead of silently querying as anon when there is no token (A10)', async () => {
    authMock.mockResolvedValue({ getToken: vi.fn().mockResolvedValue(null) });

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    await createSupabaseServerClient();
    const { accessToken } = createClientMock.mock.calls[0][2];

    // Not `{}`, not an empty-header anon client — an explicit failure that
    // the caller's existing try/catch turns into a real `sync-failed`.
    await expect(accessToken()).rejects.toThrow(/no clerk session token/i);
  });
});
