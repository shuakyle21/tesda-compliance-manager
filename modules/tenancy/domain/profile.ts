import type { Tenant, UserRole } from '@/shared/types';

/**
 * A signed-in person's identity: their role and which tenants they belong to.
 * Shape matches what `modules/tenancy/data/tenancy.ts`'s mapper produces —
 * this file used to define its own disconnected `ProfileRole`/`TenantMembership`
 * (a capitalized enum with no DB or UI counterpart, and nothing importing it).
 * `role` reuses the same `UserRole` the rest of the app already resolves
 * against (`modules/auth/data/role.ts`), rather than a second role vocabulary.
 */
export interface Profile {
  clerkUserId: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  tenants: Tenant[];
  defaultTenantId: string | null;
}

export function hasTenantMembership(profile: Profile, tenantId: string): boolean {
  return profile.tenants.some((tenant) => tenant.id === tenantId);
}
