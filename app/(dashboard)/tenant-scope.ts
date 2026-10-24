/**
 * Route-tree composition: "which school is this screen about, and may the
 * signed-in person see it?"
 *
 * Lives in `app/` for the same reason as `./tenant-access.ts`: it joins two
 * modules' private `data/` layers (`modules/auth` identity, `modules/tenancy`
 * profile). The rule itself — a scope exists only for a school the caller is
 * a member of — lives in `modules/tenancy/domain/scope.ts`; this file only
 * fetches and hands over.
 *
 * `cache()`-wrapped so the `/t/[tenantCode]` layout and its page resolve the
 * same scope for one profile read per request.
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import type { Profile } from '@/modules/tenancy/domain/profile';
import {
  defaultScope,
  scopeForCode,
  scopedPath,
  type ScopedSection,
  type TenantScope,
} from '@/modules/tenancy/domain/scope';

export type RouteScope =
  | { status: 'ok'; scope: TenantScope; profile: Profile }
  /** The code is not one of the caller's schools (or does not exist). */
  | { status: 'not-a-member'; fallback: TenantScope | null }
  /** The caller belongs to no school at all. */
  | { status: 'no-tenant-access' }
  /** The profile could not be read — "we could not check", never "no access". */
  | { status: 'unknown' };

/** The signed-in person's profile; `none` = no profile row yet, `unknown` = could not read. */
export const getSignedInProfile = cache(async (): Promise<Profile | 'none' | 'unknown'> => {
  const userId = await getAuthUserId().catch(() => null);
  if (!userId) return 'unknown';
  const snapshot = await getProfileSnapshot(userId);
  if (snapshot.status === 'ok') return snapshot.profile;
  return snapshot.status === 'not-found' ? 'none' : 'unknown';
});

export const resolveRouteScope = cache(async (code: string): Promise<RouteScope> => {
  const profile = await getSignedInProfile();
  if (profile === 'unknown') return { status: 'unknown' };
  if (profile === 'none' || profile.tenants.length === 0) return { status: 'no-tenant-access' };
  const scope = scopeForCode(profile, code);
  return scope ? { status: 'ok', scope, profile } : { status: 'not-a-member', fallback: defaultScope(profile) };
});

/**
 * For a page under `/t/[tenantCode]`: the validated scope, or null.
 *
 * Null means the segment layout is already rendering the right state (not a
 * member, no school, could not check) — the page renders nothing beneath it.
 * Deliberately not `notFound()`: layouts and pages render in parallel, so a
 * thrown 404 could race the layout's friendlier state. Security does not rest
 * on this either way — without a scope there is no tenant id to query with.
 */
export async function requireScope(
  params: Promise<{ tenantCode: string }>,
): Promise<{ scope: TenantScope; profile: Profile } | null> {
  const { tenantCode } = await params;
  const resolved = await resolveRouteScope(tenantCode);
  return resolved.status === 'ok' ? { scope: resolved.scope, profile: resolved.profile } : null;
}

export type DefaultScopeOutcome = { status: 'no-tenant-access' } | { status: 'unknown' };

/**
 * Legacy unscoped path (`/batch-cards`, a bookmark, an old link) → the same
 * section in the caller's default school. Returns only when there is no school
 * to send them to, so the caller can render that state honestly.
 */
export async function redirectToDefaultScope(
  section: ScopedSection,
  searchParams?: Record<string, string | string[] | undefined>,
): Promise<DefaultScopeOutcome> {
  const profile = await getSignedInProfile();
  if (profile === 'unknown') return { status: 'unknown' };
  const scope = profile === 'none' ? null : defaultScope(profile);
  if (!scope) return { status: 'no-tenant-access' };

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const qs = query.toString();
  redirect(scopedPath(scope.code, section, qs ? `?${qs}` : ''));
}
