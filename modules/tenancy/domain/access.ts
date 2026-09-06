/**
 * Tenant access — pure rules, no I/O (FR-02).
 *
 * Answers one question the whole app needs and no single entity contract can
 * answer for itself: *does this person belong to a school yet?*
 *
 * Why it matters, and why it is not the same as "no rows": every table's RLS
 * policy scopes rows through `app_private.can_access_tenant()`. A profile with
 * zero `profile_tenant_memberships` therefore reads zero batches, zero
 * documents, zero activity — not because those tables are empty, but because
 * the caller is not attached to any tenant. Rendering that as "No assigned
 * batches — import one" states something untrue and offers an action the user
 * cannot perform. This module names the difference so every screen can say the
 * accurate thing instead.
 *
 * Lives in `domain/` (not `data/`) so any module's contract may import it —
 * another module's `data/` is private, its `domain/` is not.
 */

import type { Profile } from '@/modules/tenancy/domain/profile';

/**
 * - `granted` — the caller belongs to at least one tenant; empty results are
 *   a real fact about the data.
 * - `none`    — the caller belongs to no tenant. Every RLS-scoped read will be
 *   empty regardless of what the tables hold.
 * - `unknown` — we could not establish either (profile read failed, or this
 *   environment has no Supabase). Never treat this as `none`: "we could not
 *   check" must not be rendered as "you have no school".
 */
export type TenantAccess = 'granted' | 'none' | 'unknown';

/** A profile with no tenant membership has access to nothing. */
export function tenantAccessOf(profile: Profile): TenantAccess {
  return profile.tenants.length > 0 ? 'granted' : 'none';
}

/** The snapshot member every entity contract gains for this verdict. */
export type NoTenantAccessSnapshot = { status: 'no-tenant-access' };

/**
 * Folds the tenant-access verdict into any contract's snapshot.
 *
 * Precedence is deliberate: this replaces **only** an `ok` snapshot. A
 * `sync-failed` or `unconfigured` snapshot passes through untouched, because
 * "you belong to no school" is a tidier story than "the fetch broke", and
 * substituting it would hide a real error behind a plausible explanation —
 * the same failure mode the sync-failed banner exists to prevent.
 *
 * `unknown` access changes nothing: an unverified verdict must not rewrite a
 * successful read.
 */
export function withTenantAccess<S extends { status: string }>(
  snapshot: S,
  access: TenantAccess,
): S | NoTenantAccessSnapshot {
  return access === 'none' && snapshot.status === 'ok' ? { status: 'no-tenant-access' } : snapshot;
}
