/**
 * User administration data layer (FR-02) — the write half of tenancy.
 *
 * `tenancy.ts` reads the signed-in person's own profile. This file is what an
 * admin uses to give *someone else* access: look a person up by email, set
 * their role, and grant them a school.
 *
 * Every statement here goes through `createSupabaseServerClient()` — the
 * anon-key client carrying the caller's Clerk token — so Postgres RLS decides
 * what is allowed (policies in migration 20260904120000). The service-role
 * client is deliberately not used: it bypasses RLS and belongs only to the
 * Clerk webhook, which has no session to scope by.
 *
 * Results are discriminated snapshots in the same shape as `BatchesSnapshot`
 * so callers map a status straight to UI, and no raw Supabase error, table
 * name or internal id ever reaches the screen.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ProfileRole as DbProfileRole } from '@/lib/supabase/database.types';
import {
  normalizeEmail,
  type AssignableRole,
  type UserAccessCommand,
} from '@/modules/tenancy/domain/userAccess';

/**
 * UI role -> DB enum. A total map over the assignable roles, the same
 * convention as `DB_TO_UI_STAGE` in `modules/batches/data/batches.ts`: the
 * compiler fails here if `AssignableRole` gains a variant with no DB value,
 * rather than the write failing at runtime.
 */
const UI_TO_DB_ROLE: Record<AssignableRole, DbProfileRole> = {
  admin: 'admin',
  coordinator: 'coordinator',
  trainer: 'trainer',
  viewer: 'viewer',
};

/**
 * A person an admin can act on: already signed up with Clerk, so a `profiles`
 * row exists to assign. `tenantIds` are only the memberships the *caller* can
 * see (RLS scopes the join), which is enough to tell "already in this school"
 * from "not in it".
 */
export interface ExistingUser {
  profileId: string;
  fullName: string | null;
  email: string | null;
  role: DbProfileRole;
  isActive: boolean;
  tenantIds: string[];
}

export type UserLookupSnapshot =
  | { status: 'found'; user: ExistingUser }
  | { status: 'not-registered' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/**
 * Outcome of granting access.
 *   - `assigned`       — role set and school granted. `alreadyMember` is true
 *                        when the person was already in that school and only
 *                        the role changed, so the UI can say so honestly.
 *   - `not-registered` — no profile for that email; the caller should invite
 *                        instead. Not an error: it is the other half of the
 *                        flow.
 *   - `denied`         — RLS refused. Either the caller is not an admin or the
 *                        target profile is outside their visibility.
 *   - `sync-failed` / `unconfigured` — as everywhere else in the repo.
 */
export type UserAssignmentSnapshot =
  | { status: 'assigned'; profileId: string; alreadyMember: boolean }
  | { status: 'not-registered' }
  | { status: 'denied' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/** Postgres `insufficient_privilege` — what an RLS `with check` failure raises. */
const RLS_VIOLATION = '42501';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

// ---------------------------------------------------------------------------
// Mapper — pure, no I/O.
// ---------------------------------------------------------------------------

type ProfileLookupRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: DbProfileRole;
  is_active: boolean;
  profile_tenant_memberships: { tenant_id: string }[] | null;
};

export function mapExistingUserRow(row: ProfileLookupRow): ExistingUser {
  return {
    profileId: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    tenantIds: (row.profile_tenant_memberships ?? []).map((m) => m.tenant_id),
  };
}

// ---------------------------------------------------------------------------
// Fetch — server-only.
// ---------------------------------------------------------------------------

/**
 * Finds the profile for an email address.
 *
 * `profiles.email` carries no unique constraint (only `clerk_user_id` does),
 * so this normalizes both sides and takes the first match rather than
 * assuming one. `ilike` rather than `eq` because the webhook stores whatever
 * casing Clerk holds, which need not match what an admin types.
 *
 * A `not-registered` result is ambiguous by design and must stay that way in
 * the UI: it means "no row this caller can see", which covers both "nobody has
 * signed up with that address" and "they exist but belong to another school".
 * Distinguishing the two would leak the membership of other tenants.
 */
export async function findUserByEmail(email: string): Promise<UserLookupSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, profile_tenant_memberships(tenant_id)')
      .ilike('email', normalizeEmail(email))
      .limit(1);

    if (error) return { status: 'sync-failed', error: error.message };
    const row = data?.[0];
    if (!row) return { status: 'not-registered' };

    return { status: 'found', user: mapExistingUserRow(row as ProfileLookupRow) };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Write.
// ---------------------------------------------------------------------------

/**
 * Sets a person's role and grants them a school.
 *
 * Two statements, not one transaction — PostgREST exposes no multi-statement
 * transaction, so ordering carries the safety instead. The role UPDATE runs
 * first because it is the harmless half to stop after: if the membership
 * INSERT then fails, the person holds a changed role but *no new access*.
 * Granting access first and failing to set the role would leave someone
 * inside a school at whatever role they happened to have.
 *
 * An UPDATE blocked by RLS is not an error in PostgREST — the row simply does
 * not match the policy's `using` clause and zero rows come back. That is why
 * this selects the updated id and treats an empty result as `denied` rather
 * than as success.
 */
export async function assignUserAccess(
  command: UserAccessCommand,
): Promise<UserAssignmentSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  const lookup = await findUserByEmail(command.email);
  if (lookup.status === 'unconfigured') return { status: 'unconfigured' };
  if (lookup.status === 'sync-failed') return { status: 'sync-failed', error: lookup.error };
  if (lookup.status === 'not-registered') return { status: 'not-registered' };

  const { user } = lookup;
  const alreadyMember = user.tenantIds.includes(command.tenantId);

  try {
    const supabase = await createSupabaseServerClient();

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: UI_TO_DB_ROLE[command.role],
        // A name the admin typed fills a blank, but never overwrites one the
        // person already set on their own Clerk account.
        ...(command.fullName && !user.fullName ? { full_name: command.fullName } : {}),
      })
      .eq('id', user.profileId)
      .select('id');

    if (updateError) {
      if (updateError.code === RLS_VIOLATION) return { status: 'denied' };
      return { status: 'sync-failed', error: updateError.message };
    }
    // Zero rows means the policy's `using` clause excluded this row.
    if (!updated || updated.length === 0) return { status: 'denied' };

    if (alreadyMember) {
      return { status: 'assigned', profileId: user.profileId, alreadyMember: true };
    }

    const { error: membershipError } = await supabase.from('profile_tenant_memberships').insert({
      profile_id: user.profileId,
      tenant_id: command.tenantId,
      // Always false, never "true if this looks like their first school".
      // `user.tenantIds` comes from an RLS-scoped join — the membership read
      // policy is `can_access_tenant(tenant_id)` — so an admin of school A
      // sees an empty list for someone who already belongs to school B. Using
      // that emptiness would write a *second* default membership, and nothing
      // in the schema forbids one: `mapProfileRow` then picks whichever
      // `is_default` row comes back first, so where the person lands turns on
      // row order. In a multi-tenant compliance tool that is a silent
      // wrong-school landing.
      //
      // Costs nothing: `mapProfileRow` falls back to `memberships[0]` when no
      // membership is flagged, so a person with one school still lands in it.
      // The only writer of `true` is the invitation path in
      // `modules/auth/data/provisioning.ts`, where the profile is brand new
      // and the service-role client can see that it genuinely has no others.
      is_default: false,
    });

    if (membershipError) {
      if (membershipError.code === RLS_VIOLATION) return { status: 'denied' };
      return { status: 'sync-failed', error: membershipError.message };
    }

    return { status: 'assigned', profileId: user.profileId, alreadyMember: false };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}
