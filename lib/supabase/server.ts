import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import type { Database } from './database.types';

/**
 * True only when both Supabase env vars are present. Callers use this to tell
 * "Supabase isn't wired up in this environment" (dev/demo → fall back silently)
 * apart from "Supabase is wired up but the request failed" (→ a real
 * sync-failed signal). See `getBatchesSnapshot` (TES-8 AC6, #65).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

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
