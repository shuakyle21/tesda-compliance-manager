'use server';

/**
 * Server Action — grant a person access to this workspace (FR-01/FR-02).
 *
 * This is the repo's first write path, so it sets the shape: validate through
 * a module's `domain/`, write through a module's `data/`, and return a
 * discriminated state rather than throwing. A thrown error in a Server Action
 * reaches the browser as an opaque digest, which would strand the admin with
 * no idea whether anything was written.
 *
 * It lives in `app/` rather than in a module because it composes *two*
 * modules' data layers — `tenancy` (the Postgres write) and `auth` (the Clerk
 * invitation) — and a module's `data/` is private to it, so neither could
 * call the other. That is the same reason `billing/page.tsx` fetches from
 * several modules and passes the results down. No business rule lives here:
 * validation is `modules/tenancy/domain/userAccess.ts`, the write is
 * `modules/tenancy/data/users.ts`.
 *
 * SECURITY. The admin check below is defence in depth and usability, not the
 * boundary. The boundary is Postgres RLS (migration 20260904120000): a
 * non-admin who reached this action anyway would still have their UPDATE
 * match zero rows and their INSERT rejected, and would get `denied`. The
 * Clerk invitation has no RLS behind it, so for that branch this check is
 * load-bearing and runs before it.
 */

import { getAuthUserId } from '@/modules/auth/data/auth';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { inviteUser } from '@/modules/auth/data/invitations';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import { assignUserAccess } from '@/modules/tenancy/data/users';
import {
  validateUserAccessDraft,
  type CreateUserFormState,
} from '@/modules/tenancy/domain/userAccess';

export async function createUserAction(
  _previous: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  const clerkUserId = await getAuthUserId();
  if (!clerkUserId) return { status: 'denied' };

  const profileSnapshot = await getProfileSnapshot(clerkUserId);
  if (profileSnapshot.status === 'unconfigured') return { status: 'unconfigured' };
  if (profileSnapshot.status === 'sync-failed') return { status: 'failed' };
  // `not-found` means the caller has no profile row at all — no role, no
  // tenants, nothing to grant from.
  if (profileSnapshot.status !== 'ok') return { status: 'denied' };

  // `resolveTrustedRole`, never `resolveRouteRole`: the latter honours a
  // `?role=` query override, which would let any signed-in user claim admin
  // and reach the Clerk invitation branch that RLS does not cover.
  const trustedRole = await resolveTrustedRole(profileSnapshot.profile.role);
  if (trustedRole !== 'admin') return { status: 'denied' };

  // An admin may only place someone in a school they belong to themselves —
  // the same rule the RLS policy enforces, applied here so the admin gets a
  // field-level message instead of a bare denial.
  const allowedTenantIds = profileSnapshot.profile.tenants.map((tenant) => tenant.id);

  const validation = validateUserAccessDraft(
    {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      role: formData.get('role'),
      tenantId: formData.get('tenantId'),
    },
    allowedTenantIds,
  );

  if (!validation.ok) return { status: 'invalid', errors: validation.errors };

  const { command } = validation;

  // Path 1 — they have already signed up: set the role and grant the school
  // directly, and they have access on their next request.
  const assignment = await assignUserAccess(command);

  switch (assignment.status) {
    case 'assigned':
      return {
        status: 'assigned',
        email: command.email,
        alreadyMember: assignment.alreadyMember,
      };
    case 'denied':
      return { status: 'denied' };
    case 'unconfigured':
      return { status: 'unconfigured' };
    case 'sync-failed':
      // The raw message stays in the server log — never on the screen.
      console.error('createUserAction: assignment failed', assignment.error);
      return { status: 'failed' };
    case 'not-registered':
      break;
  }

  // Path 2 — nobody has signed up with that address. There is no `profiles`
  // row to write (`clerk_user_id` is NOT NULL), so the grant travels on a
  // Clerk invitation and the `user.created` webhook applies it on acceptance.
  const invitation = await inviteUser(command.email, {
    role: command.role,
    tenantId: command.tenantId,
  });

  switch (invitation.status) {
    case 'invited':
      return { status: 'invited', email: command.email };
    case 'duplicate':
      return { status: 'duplicate', email: command.email };
    case 'failed':
      console.error('createUserAction: invitation failed', invitation.error);
      return { status: 'failed' };
  }
}
