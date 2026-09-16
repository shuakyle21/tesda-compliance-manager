'use client';

// Marked so that importing this from a Server Component fails at build time
// rather than at runtime on a `useAuth` call, now that a `data/` layer depends
// on it (`modules/batches/data/learners.ts`).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import type { Database } from './database.types';

/** The browser client's concrete type, for fetchers that receive one. */
export type BrowserSupabaseClient = SupabaseClient<Database>;

/**
 * Browser-safe configuration check, mirroring `isSupabaseConfigured` in
 * `lib/supabase/server.ts`. Kept here rather than imported from there because
 * importing that module into a Client Component would pull Clerk's server SDK
 * into the browser bundle. Both vars are `NEXT_PUBLIC_`, so Next inlines them
 * at build time — they must be referenced literally for that to happen.
 */
export function isSupabaseConfiguredInBrowser(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Browser-side Supabase client hook that carries the caller's Clerk identity
 * so RLS can identify the calling user.
 *
 * Mirrors `lib/supabase/server.ts`: Clerk's native third-party auth
 * integration, not a custom JWT template (deprecated 1 Apr 2025). The
 * `accessToken` callback re-fetches on expiry, which a hand-set
 * Authorization header cannot do. Because it is set, never call
 * `supabase.auth.*` on this client.
 *
 * Use only in Client Components, and only for on-demand drill-in reads. Page
 * level reads stay in Server Components: RLS is row-level, so a browser query
 * cannot enforce the role-scoped *column* omissions that trainer-facing DTOs
 * depend on (`modules/batches/data/metrics.ts`). Every query issued through
 * this client must name its columns explicitly rather than `select('*')`.
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () => {
            const token = await getToken();

            // Same reasoning as the server client: a null token would query as
            // `anon`, and RLS answers that with zero rows and no error —
            // indistinguishable from "you have no data".
            if (!token) {
              throw new Error('No Clerk session token available for the Supabase request.');
            }

            return token;
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      ),
    [getToken],
  );
}
