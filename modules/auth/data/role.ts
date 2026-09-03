/**
 * Role resolution for dashboard-tree routes (FR-01).
 *
 * Extracted so the billing route does not become a third copy of the resolver
 * that `app/(dashboard)/dashboard/page.tsx` grew inline. The dashboard still
 * carries its own copy; migrating it here is a follow-up, not part of this
 * change.
 *
 * This is a *usability* gate. The security boundary is Postgres RLS plus the
 * server-side redirect in the route — never this function's return value alone.
 */

import { getCurrentUser } from '@/modules/auth/data/auth';
import type { UserRole } from '@/shared/types';

export type OfficeRole = Extract<UserRole, 'admin' | 'coordinator' | 'viewer'>;
export type ResolvedRole = OfficeRole | 'trainer' | null;

export type RouteSearchParams = Record<string, string | string[] | undefined>;

/**
 * Extracts the first value from a search param (which may be a single string,
 * an array, or undefined) and normalizes it to lowercase. Returns null when
 * the param is absent or empty.
 */
export function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.toLowerCase() ?? null;
  return value?.toLowerCase() ?? null;
}

/**
 * Type guard: returns true when the role is an office role (admin, coordinator,
 * or viewer), as opposed to trainer or null.
 */
export function isOfficeRole(role: string | null): role is OfficeRole {
  return role === 'admin' || role === 'coordinator' || role === 'viewer';
}

/**
 * Narrows a role string to a `ResolvedRole`, or `null` if it's neither an
 * office role nor trainer.
 */
function asResolvedRole(role: string | null): ResolvedRole {
  return isOfficeRole(role) || role === 'trainer' ? role : null;
}

/**
 * Resolves the acting role with this precedence:
 *   1. `?role=` preview override — a dev/demo affordance, stays available
 *      even once real identity exists.
 *   2. `dbRole` — the real role from the caller's `profiles` row (via
 *      `modules/tenancy/data`'s `getProfileSnapshot`). Passed in rather than
 *      fetched here because a module's `data/` is private to it; the caller
 *      (an `app/` route) fetches both and passes the result down.
 *   3. Clerk `publicMetadata.role` — pre-dates the real resolver, kept as a
 *      last-resort fallback for a signed-in user with no `profiles` row yet.
 * Returns `null` when none answer — callers must fall back to the
 * least-privileged variant (viewer), not to a write-enabled one.
 */
export async function resolveRouteRole(
  params: RouteSearchParams,
  dbRole?: UserRole | null,
): Promise<ResolvedRole> {
  const fromQuery = asResolvedRole(firstParam(params.role));
  if (fromQuery) return fromQuery;

  const fromDb = asResolvedRole(dbRole ?? null);
  if (fromDb) return fromDb;

  const user = await getCurrentUser().catch(() => null);
  const metadataRole =
    typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role.toLowerCase() : null;

  return asResolvedRole(metadataRole);
}
