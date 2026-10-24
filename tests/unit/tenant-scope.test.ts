import { describe, expect, it, vi } from 'vitest';
import { defaultScope, parseScopedPath, scopeForCode, scopedPath } from '@/modules/tenancy/domain/scope';
import type { Profile } from '@/modules/tenancy/domain/profile';
import type { Tenant } from '@/shared/types';

// `resolveTrustedRole` must never consult Clerk. If it did, this mock — an
// admin in Clerk metadata — would leak into the result.
vi.mock('@/modules/auth/data/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ publicMetadata: { role: 'admin' } })),
}));
import { resolveTrustedRole } from '@/modules/auth/data/role';

function tenant(id: string, code: string): Tenant {
  return { id, code, name: `${code} School` } as Tenant;
}

function profile(tenants: Tenant[], defaultTenantId: string | null = null): Profile {
  return { clerkUserId: 'user_1', fullName: 'Test', email: null, role: 'coordinator', tenants, defaultTenantId };
}

const AKB = tenant('t-akb', 'AKB');
const NEN = tenant('t-nen', 'NEN');

describe('tenant scope', () => {
  it('builds a scope only for a school the caller is a member of', () => {
    expect(scopeForCode(profile([AKB, NEN]), 'nen')).toEqual({ tenantId: 't-nen', code: 'NEN', name: 'NEN School' });
    expect(scopeForCode(profile([AKB]), 'NEN')).toBeNull();
  });

  it('defaults to the flagged membership, then the first one, then none', () => {
    expect(defaultScope(profile([AKB, NEN], 't-nen'))?.code).toBe('NEN');
    expect(defaultScope(profile([AKB, NEN], 'missing'))?.code).toBe('AKB');
    expect(defaultScope(profile([]))).toBeNull();
  });

  it('round-trips a scoped path', () => {
    const path = scopedPath('AKB', 'table-view', '?batch=DEV-AKB-001');
    expect(path).toBe('/t/akb/table-view?batch=DEV-AKB-001');
    expect(parseScopedPath('/t/akb/table-view')).toEqual({ code: 'akb', section: 'table-view' });
    expect(parseScopedPath('/t/akb')).toEqual({ code: 'akb', section: 'dashboard' });
    expect(parseScopedPath('/profile')).toBeNull();
  });
});

describe('resolveTrustedRole — profiles.role is the only authority', () => {
  it('uses the database role even when Clerk metadata says otherwise', async () => {
    expect(await resolveTrustedRole('viewer')).toBe('viewer');
  });

  it('resolves no role when there is no profile row, rather than falling back to Clerk', async () => {
    expect(await resolveTrustedRole(null)).toBeNull();
  });
});
