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

export function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.toLowerCase() ?? null;
  return value?.toLowerCase() ?? null;
}

export function isOfficeRole(role: string | null): role is OfficeRole {
  return role === 'admin' || role === 'coordinator' || role === 'viewer';
}

/**
 * Resolves the acting role from the `?role=` preview override first, then Clerk
 * metadata. Returns `null` when neither answers — callers must fall back to the
 * least-privileged variant (viewer), not to a write-enabled one.
 *
 * The `?role=` override is a preview affordance that stays until the real
 * tenant/role resolver lands (TES-34).
 */
export async function resolveRouteRole(params: RouteSearchParams): Promise<ResolvedRole> {
  const queryRole = firstParam(params.role);
  if (isOfficeRole(queryRole) || queryRole === 'trainer') return queryRole;

  const user = await getCurrentUser().catch(() => null);
  const metadataRole =
    typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role.toLowerCase() : null;

  if (isOfficeRole(metadataRole) || metadataRole === 'trainer') return metadataRole;
  return null;
}
