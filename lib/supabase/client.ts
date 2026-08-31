import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import type { Database } from './database.types';

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
 * Use only in Client Components. This has no consumers today — the app is
 * Server-Component-first and reads go through module `data/` layers. Reach for
 * it only for genuine client-side interactivity.
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
