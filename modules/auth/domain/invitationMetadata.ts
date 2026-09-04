/**
 * The access grant an admin attaches to a Clerk invitation — pure, no I/O.
 *
 * WHY THIS SHAPE EXISTS
 * ---------------------
 * `profiles.clerk_user_id` is `not null unique`, so no profile row can exist
 * before the person has a Clerk account. An admin inviting someone who has
 * never signed up therefore cannot write their role and school at invite
 * time — there is nothing to write them against yet. The grant has to be
 * parked somewhere until the invitation is accepted.
 *
 * It is parked on the Clerk invitation's `publicMetadata`, which Clerk copies
 * onto `User.publicMetadata` when the person signs up (verified against the
 * installed `@clerk/backend` types: "Once the user accepts the invitation and
 * signs up, these metadata will end up in the user's public metadata"). The
 * `user.created` webhook then reads it back and applies the grant.
 *
 * WHY THAT IS SAFE TO TRUST
 * -------------------------
 * The same SDK doc states `publicMetadata` is "metadata that can be read and
 * set only from the Backend API" — it is not writable from the client, so a
 * person signing up cannot author or tamper with the grant that arrives with
 * them. The value is written by an authenticated admin holding the secret
 * key, and it is that admin's authority the webhook is honouring, not the
 * new user's.
 *
 * This is the one narrow exception to the rule stated in
 * `modules/auth/data/provisioning.ts` that provisioning must never grant
 * tenant access itself. The rule exists so that *self* sign-up cannot confer
 * access; an admin-authored invitation is the opposite case. The keys are
 * namespaced and the parser below is strict so that stray metadata from any
 * other source can never be mistaken for a grant.
 */

/**
 * Namespaced so metadata set for some unrelated purpose can never collide
 * with a grant. Read in `provisioning.ts`; written in `data/invitations.ts`.
 */
export const INVITE_ROLE_KEY = 'tvicamsRole';
export const INVITE_TENANT_KEY = 'tvicamsTenantId';

/** DB `public.profile_role` values. Kept literal — this file stays pure. */
const DB_ROLES = ['admin', 'coordinator', 'trainer', 'viewer'] as const;
type DbRole = (typeof DB_ROLES)[number];

export interface InvitationGrant {
  role: DbRole;
  tenantId: string;
}

export function buildInvitationMetadata(grant: InvitationGrant): Record<string, string> {
  return {
    [INVITE_ROLE_KEY]: grant.role,
    [INVITE_TENANT_KEY]: grant.tenantId,
  };
}

/**
 * Reads a grant back out of a Clerk user's `publicMetadata`, or returns null.
 *
 * All-or-nothing on purpose: a half-formed grant (a role with no school, or a
 * school with an unrecognised role) yields null rather than a partial apply.
 * The caller's fallback is the safe one — the least-privileged role and no
 * tenant access — so failing to parse costs an admin one manual assignment,
 * while accepting a partial grant could hand out access nobody authorised.
 */
export function parseInvitationGrant(metadata: unknown): InvitationGrant | null {
  if (typeof metadata !== 'object' || metadata === null) return null;

  const bag = metadata as Record<string, unknown>;
  const role = bag[INVITE_ROLE_KEY];
  const tenantId = bag[INVITE_TENANT_KEY];

  if (typeof role !== 'string' || !(DB_ROLES as readonly string[]).includes(role)) return null;
  if (typeof tenantId !== 'string' || tenantId.trim() === '') return null;

  return { role: role as DbRole, tenantId: tenantId.trim() };
}
