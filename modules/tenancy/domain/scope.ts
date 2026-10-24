/**
 * Tenant scope — which school a screen is about. Pure domain logic, no I/O.
 *
 * Locked domain fact: tenant context lives in the URL path segment
 * (`/t/<code>/<section>`). Before this existed every office screen read every
 * school the caller belonged to, so a multi-school user saw three schools'
 * batches summed under one school's name (audit I1).
 *
 * A scope is **selection, not authorization.** It is only ever built from the
 * caller's own memberships (`profile.tenants`, itself an RLS-scoped read), so
 * an unknown or foreign code yields `null`, never a scope. Queries then add
 * `tenant_id = scope.tenantId` on top of RLS — RLS remains the security
 * boundary (RULES.md §1); the filter only picks one of the schools RLS
 * already allows.
 */

import type { Profile } from './profile';

export interface TenantScope {
  tenantId: string;
  code: string;
  name: string;
}

/** Sections that live under a tenant scope. Account/admin pages and trainer routes do not. */
export const SCOPED_SECTIONS = [
  'dashboard',
  'batch-cards',
  'table-view',
  'documents',
  'billing',
  'analytics',
  'report',
  'activity-log',
] as const;
export type ScopedSection = (typeof SCOPED_SECTIONS)[number];

export function isScopedSection(value: string): value is ScopedSection {
  return (SCOPED_SECTIONS as readonly string[]).includes(value);
}

function toScope(tenant: Profile['tenants'][number]): TenantScope {
  return { tenantId: tenant.id, code: tenant.code, name: tenant.name };
}

/** The scope for a URL code, if — and only if — the caller is a member of that school. */
export function scopeForCode(profile: Profile, code: string): TenantScope | null {
  const wanted = code.toLowerCase();
  const tenant = profile.tenants.find((t) => t.code.toLowerCase() === wanted);
  return tenant ? toScope(tenant) : null;
}

/** The caller's default school (or their first membership), or null with none. */
export function defaultScope(profile: Profile): TenantScope | null {
  const tenant = profile.tenants.find((t) => t.id === profile.defaultTenantId) ?? profile.tenants[0];
  return tenant ? toScope(tenant) : null;
}

export function scopedPath(code: string, section: ScopedSection, query = ''): string {
  return `/t/${encodeURIComponent(code.toLowerCase())}/${section}${query}`;
}

/** `{ code, section }` from a scoped pathname, or null for any other path. */
export function parseScopedPath(pathname: string): { code: string; section: string } | null {
  const match = /^\/t\/([^/]+)(?:\/([^/?#]+))?/.exec(pathname);
  return match ? { code: decodeURIComponent(match[1]), section: match[2] ?? 'dashboard' } : null;
}
