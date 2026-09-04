/**
 * Clerk invitations (FR-01) — the "this person has never signed up" half of
 * user administration.
 *
 * `modules/tenancy/data/users.ts` assigns a role and school to somebody who
 * already has a `profiles` row. That row only exists once they have a Clerk
 * account, so inviting a newcomer is a separate operation against Clerk's
 * Backend API — it cannot be done in Postgres.
 *
 * All server-side Clerk calls live in this module by convention (see
 * `data/auth.ts`). The grant travels on the invitation's `publicMetadata` and
 * is applied by the `user.created` webhook; the reasoning and the safety
 * argument are in `modules/auth/domain/invitationMetadata.ts`.
 *
 * Server-only: `clerkClient()` reads `CLERK_SECRET_KEY`. Never import this
 * into a Client Component.
 */

import { clerkClient } from '@clerk/nextjs/server';
import {
  buildInvitationMetadata,
  type InvitationGrant,
} from '@/modules/auth/domain/invitationMetadata';

/**
 * Outcome of sending an invitation.
 *   - `invited`    — Clerk accepted it and is emailing the person.
 *   - `duplicate`  — Clerk already holds a pending invitation, or an account,
 *                    for this address. Re-sending would be a no-op at best
 *                    and a second confusing email at worst.
 *   - `failed`     — anything else. `error` is for the server log only.
 */
export type InvitationSnapshot =
  | { status: 'invited'; invitationId: string }
  | { status: 'duplicate' }
  | { status: 'failed'; error: string };

/**
 * Clerk raises HTTP 400 with this code when `ignoreExisting` is false and the
 * address already has a pending invitation or an account.
 */
const DUPLICATE_CODE = 'duplicate_record';

function isDuplicateError(err: unknown): boolean {
  const errors = (err as { errors?: { code?: string }[] } | null)?.errors;
  return Array.isArray(errors) && errors.some((e) => e?.code === DUPLICATE_CODE);
}

/**
 * Invites someone to the app with their role and school already decided.
 *
 * `ignoreExisting` stays at its default of false so a second invitation for
 * the same address is reported rather than silently created: two live
 * invitations carrying *different* grants would make which one the person
 * clicks decide their access, which is not a race an access-control flow
 * should have.
 *
 * `redirectUrl` sends the accepted invitation to the app's own sign-up route,
 * which is where Clerk's ticket flow completes. Derived from the configured
 * app URL rather than hardcoded so the link is correct per deployment; when
 * no URL is configured the parameter is omitted and Clerk falls back to the
 * instance's own setting rather than sending anyone to a wrong host.
 */
export async function inviteUser(
  emailAddress: string,
  grant: InvitationGrant,
): Promise<InvitationSnapshot> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');

  try {
    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress,
      publicMetadata: buildInvitationMetadata(grant),
      ...(appUrl ? { redirectUrl: `${appUrl}/sign-up` } : {}),
    });

    return { status: 'invited', invitationId: invitation.id };
  } catch (err) {
    if (isDuplicateError(err)) return { status: 'duplicate' };
    return { status: 'failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
