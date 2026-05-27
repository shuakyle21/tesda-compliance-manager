export const profileRoles = [
  "Admin",
  "Coordinator",
  "Trainer",
  "Viewer",
] as const;

export type ProfileRole = (typeof profileRoles)[number];

export type TenantMembership = {
  tenantId: string;
  tenantName: string;
};

export type Profile = {
  clerkUserId: string;
  role: ProfileRole;
  tenantMemberships: TenantMembership[];
};

export function isProfileRole(role: string): role is ProfileRole {
  return profileRoles.includes(role as ProfileRole);
}

export function hasTenantMembership(profile: Profile, tenantId: string) {
  return profile.tenantMemberships.some((membership) => membership.tenantId === tenantId);
}
