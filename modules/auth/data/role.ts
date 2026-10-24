/**
 * Role resolution for dashboard-tree routes (FR-01).
 *
 * One resolver for every dashboard-tree route; the dashboard's former inline
 * Clerk-metadata copy is gone. `profiles.role` is the only role authority.
 *
 * This is a *usability* gate. The security boundary is Postgres RLS plus the
 * server-side redirect in the route — never this function's return value alone.
 */

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
 * Resolves the acting role from the one trusted source: `dbRole`, the caller's
 * `profiles.role` (via `modules/tenancy/data`'s `getProfileSnapshot`) — the
 * same column RLS reads, so the UI and the database can no longer disagree
 * about who someone is. Passed in rather than fetched here because a module's
 * `data/` is private to it; the caller (an `app/` route) fetches and passes it.
 *
 * Clerk is identity only. This used to fall back to Clerk
 * `publicMetadata.role`, and the dashboard read that while the sidebar read
 * the DB — one admin was shown as ADMIN and VIEWER on the same screen (audit
 * I5). A signed-in user with no `profiles` row now has no role: `null`, and
 * callers fall back to the least-privileged variant (viewer).
 *
 * This is what redirect/authorization decisions must call — never
 * `resolveRouteRole`, whose `?role=` override lets any caller claim any role
 * and would let a real trainer skip the office-only redirect by requesting
 * `?role=admin`.
 */
export async function resolveTrustedRole(dbRole?: UserRole | null): Promise<ResolvedRole> {
  return asResolvedRole(dbRole ?? null);
}

/**
 * Picks which office-role variant of a screen to *render*, given a `?role=`
 * preview override and an already-resolved trusted role.
 *
 * Pure and synchronous, unlike `resolveRouteRole`: the caller has already done
 * the trusted lookup and acted on it (a trainer, for instance, has already
 * been redirected), so this only chooses a presentation variant. A `?role=`
 * value reaching here therefore cannot escalate anything.
 *
 * Least-privilege fallback: when neither source names an office role — the
 * lookup succeeded but no role is set — this returns read-only `viewer`, never
 * a write-enabled variant. Callers must not substitute their own default.
 */
export function resolveDisplayRole(queryRole: string | null, trustedRole: ResolvedRole): OfficeRole {
  if (isOfficeRole(queryRole)) return queryRole;
  return toOfficeRole(trustedRole);
}

/**
 * The least-privilege narrowing on its own: anything that is not an office
 * role — trainer, null, an unrecognised string — becomes read-only `viewer`.
 *
 * Named once here because every dashboard-tree route needs it at the point
 * where a resolved role meets an office-only screen, and two hand-written
 * spellings of one fallback is how the two drift apart.
 */
export function toOfficeRole(role: ResolvedRole | string | null): OfficeRole {
  return isOfficeRole(role) ? role : 'viewer';
}

/**
 * Resolves the acting role for *presentation* purposes, with this precedence:
 *   1. `?role=` preview override — a dev/demo affordance, stays available
 *      even once real identity exists. Lets an already-authorized caller
 *      preview another role's UI; it is not a security signal.
 *   2. Falls through to `resolveTrustedRole` (`profiles.role`).
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
