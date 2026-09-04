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
 * the param is absent (including an empty array); empty string inputs,
 * including `['']`, remain an empty string after lowercasing.
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
 * Resolves the acting role from trusted sources only:
 *   1. `dbRole` — the real role from the caller's `profiles` row (via
 *      `modules/tenancy/data`'s `getProfileSnapshot`). Passed in rather than
 *      fetched here because a module's `data/` is private to it; the caller
 *      (an `app/` route) fetches both and passes the result down.
 *   2. Clerk `publicMetadata.role` — pre-dates the real resolver, kept as a
 *      last-resort fallback for a signed-in user with no `profiles` row yet.
 * Returns `null` when neither answers — callers must fall back to the
 * least-privileged variant (viewer), not to a write-enabled one.
 *
 * This is what redirect/authorization decisions must call — never
 * `resolveRouteRole`, whose `?role=` override lets any caller claim any role
 * and would let a real trainer skip the office-only redirect by requesting
 * `?role=admin`.
 */
export async function resolveTrustedRole(dbRole?: UserRole | null): Promise<ResolvedRole> {
  const fromDb = asResolvedRole(dbRole ?? null);
  if (fromDb) return fromDb;

  const user = await getCurrentUser().catch(() => null);
  const metadataRole =
    typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role.toLowerCase() : null;

  return asResolvedRole(metadataRole);
}

/**
 * Resolves the acting role for *presentation* purposes, with this precedence:
 *   1. `?role=` preview override — a dev/demo affordance, stays available
 *      even once real identity exists. Lets an already-authorized caller
 *      preview another role's UI; it is not a security signal.
 *   2/3. Falls through to `resolveTrustedRole` (`dbRole`, then Clerk
 *      `publicMetadata.role`).
 *
 * Do not use this return value to gate a redirect or any write — call
 * `resolveTrustedRole` for that instead.
 */
export async function resolveRouteRole(
  params: RouteSearchParams,
  dbRole?: UserRole | null,
): Promise<ResolvedRole> {
  const fromQuery = asResolvedRole(firstParam(params.role));
  if (fromQuery) return fromQuery;

  return resolveTrustedRole(dbRole);
}
