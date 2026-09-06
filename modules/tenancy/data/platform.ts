/**
 * Platform-admin resolution (FR-02, ADR-006).
 *
 * Answers one question: is the signed-in person a platform admin — the
 * operator who provisions schools, in the way TESDA itself issues T2MIS/BSRS
 * accounts?
 *
 * WHY AN RPC AND NOT A SELECT. `public.platform_admins` is deliberately
 * granted to nobody and carries no policy for `authenticated`, so it cannot be
 * read through the Clerk-scoped anon client at all. That is what stops the
 * role from being self-granted through any application path. The
 * `security definer` function `current_user_is_platform_admin()` returns only
 * the boolean about the *caller*, never the membership list, so asking the
 * question leaks nothing.
 *
 * This is a usability and defence-in-depth signal, not the security boundary.
 * The boundary is RLS (migration 20260906130000): a non-platform-admin who
 * reached the write path anyway would have their INSERT rejected by policy.
 */

import { cache } from 'react';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

export type PlatformAdminSnapshot =
  | { status: 'ok'; isPlatformAdmin: boolean }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

/**
 * Wrapped in `cache` so the layout, the route and the action can each ask
 * without three round trips in one render — the same treatment
 * `getProfileSnapshot` gets in `tenancy.ts`.
 */
export const getPlatformAdminSnapshot = cache(async function getPlatformAdminSnapshot(): Promise<PlatformAdminSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('current_user_is_platform_admin');

    if (error) return { status: 'sync-failed', error: error.message };

    // The function is `returns boolean` and never null, but a false here on an
    // unexpected shape is the safe direction: an unresolved answer must show
    // the smaller surface, never the larger one.
    return { status: 'ok', isPlatformAdmin: data === true };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
});

/**
 * Convenience for callers that only need the boolean and treat every failure
 * as "not a platform admin" — the sidebar, for instance, where a failed check
 * should hide the row rather than render a link into a denial.
 *
 * Never use this on the route or in the action: they must tell `sync-failed`
 * apart from `denied`, because the two need different screens (RULES.md
 * sec.4 rule 24).
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const snapshot = await getPlatformAdminSnapshot();
  return snapshot.status === 'ok' && snapshot.isPlatformAdmin;
}
