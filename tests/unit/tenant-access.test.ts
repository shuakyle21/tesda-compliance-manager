/**
 * Tenant access (live-data migration Phase 2) — the fourth snapshot state.
 *
 * These tests exist to pin two rules that are easy to "simplify" away later,
 * and whose failure modes are silent:
 *   1. `unknown` must never behave like `none` — "we could not check" rendered
 *      as "you have no school" tells a fully-provisioned coordinator they were
 *      never assigned.
 *   2. The fold replaces only an `ok` snapshot — otherwise a real sync failure
 *      gets overwritten with a tidier, wrong explanation.
 */

import { describe, expect, it } from 'vitest';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { deriveTenantAccess } from '@/modules/tenancy/data/tenancy';
import type { Profile } from '@/modules/tenancy/domain/profile';
import type { Tenant } from '@/shared/types';

const TENANT: Tenant = {
  id: 'tnt_1',
  code: 'AKB',
  name: 'Agri-Kaunlaran Bulacan',
  region: 'III',
  type: 'private',
  color: '',
  plan: '',
  activeBatches: 0,
  totalScholars: 0,
};

function profile(tenants: Tenant[]): Profile {
  return {
    clerkUserId: 'user_1',
    fullName: 'Karina Cruz',
    email: 'k@example.test',
    role: 'coordinator',
    tenants,
    defaultTenantId: tenants[0]?.id ?? null,
  };
}

describe('tenantAccessOf', () => {
  it('grants access when the profile belongs to at least one tenant', () => {
    expect(tenantAccessOf(profile([TENANT]))).toBe('granted');
  });

  it('reports none when the profile belongs to no tenant', () => {
    expect(tenantAccessOf(profile([]))).toBe('none');
  });
});

describe('deriveTenantAccess', () => {
  it('reads the verdict off an ok profile snapshot', () => {
    expect(deriveTenantAccess({ status: 'ok', profile: profile([TENANT]) })).toBe('granted');
    expect(deriveTenantAccess({ status: 'ok', profile: profile([]) })).toBe('none');
  });

  it('treats a missing profile row as no access, not as unknown', () => {
    // A signed-in Clerk user whose `profiles` row has not been provisioned has
    // no membership either way, and the honest message is the same one.
    expect(deriveTenantAccess({ status: 'not-found' })).toBe('none');
  });

  it('treats a failed or unconfigured read as unknown, never as none', () => {
    expect(deriveTenantAccess({ status: 'sync-failed', error: 'boom' })).toBe('unknown');
    expect(deriveTenantAccess({ status: 'unconfigured' })).toBe('unknown');
  });
});

describe('withTenantAccess', () => {
  const ok = { status: 'ok' as const, batches: [], dataAsOf: null };
  const failed = { status: 'sync-failed' as const, error: 'boom' };
  const unconfigured = { status: 'unconfigured' as const };

  it('rewrites an ok snapshot when the caller belongs to no tenant', () => {
    expect(withTenantAccess(ok, 'none')).toEqual({ status: 'no-tenant-access' });
  });

  it('leaves an ok snapshot alone when access is granted or unknown', () => {
    expect(withTenantAccess(ok, 'granted')).toBe(ok);
    expect(withTenantAccess(ok, 'unknown')).toBe(ok);
  });

  it('never overwrites a real failure with the tidier explanation', () => {
    // The whole point of the sync-failed banner is that a broken fetch reads as
    // broken. "You belong to no school" is a more satisfying story and would
    // bury the error.
    expect(withTenantAccess(failed, 'none')).toBe(failed);
    expect(withTenantAccess(unconfigured, 'none')).toBe(unconfigured);
  });
});
