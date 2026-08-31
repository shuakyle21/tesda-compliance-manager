import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import type { Database } from './database.types';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Server-side Supabase client carrying the caller's Clerk identity so RLS can
 * make every authorization decision.
 *
 * Uses Clerk's **native third-party auth integration**, not a custom JWT
 * template: Clerk deprecated Supabase JWT templates on 1 Apr 2025, and this
 * schema never needed one — `app_private.current_clerk_user_id()` reads only
 * `auth.jwt() ->> 'sub'`, and looks role and tenant up from `profiles` /
 * `profile_tenant_memberships` in the database. The plain session token
 * already carries `sub`.
 *
 * The `accessToken` callback is deliberate: unlike a static Authorization
 * header it is re-invoked when the token expires, so a long-lived client does
 * not start sending a stale token. Because it is set, never call
 * `supabase.auth.*` on this client.
 */
export async function createSupabaseServerClient() {
  const { getToken } = await auth();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        const token = await getToken();

        // Fail loudly. Returning null here would build an unauthenticated
        // `anon` client, and RLS would answer every query with zero rows and
        // no error — indistinguishable from "this user has no batches". For a
        // compliance tool that silent degradation is the dangerous outcome, so
        // the caller's try/catch should surface it as `sync-failed` instead.
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
  );
}
