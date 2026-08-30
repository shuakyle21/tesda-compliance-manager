import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Service-role Supabase client — bypasses RLS entirely.
 *
 * Use ONLY for trusted server-to-server writes that have no Clerk session to
 * scope them by (e.g. the Clerk webhook provisioning `profiles` before the
 * user has ever signed in). Every other code path must use
 * `createSupabaseServerClient` so RLS stays the security boundary.
 *
 * Import this only from server-only code (Route Handlers, webhook handlers).
 * `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed `NEXT_PUBLIC_` and must
 * never be read outside this file.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'createSupabaseServiceClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.',
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
