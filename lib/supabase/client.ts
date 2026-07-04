import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import type { Database } from './database.types';

/**
 * Browser-side Supabase client hook that injects the Clerk JWT on every
 * request so RLS policies can identify the calling user.
 *
 * Use only in Client Components. The JWT template in Clerk must be named
 * "supabase".
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: async (url, options = {}) => {
              const token = await getToken({ template: 'supabase' });
              const headers = new Headers(options.headers);
              if (token) headers.set('Authorization', `Bearer ${token}`);
              return fetch(url, { ...options, headers });
            },
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
