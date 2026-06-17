import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import type { Database } from './database.types';

/**
 * Server-side Supabase client that passes the Clerk JWT so RLS policies
 * can identify the calling user via auth.jwt() ->> 'sub'.
 *
 * Use only in Server Components, Route Handlers, and Server Actions.
 * The JWT template in Clerk must be named "supabase".
 */
export async function createSupabaseServerClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' });

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
