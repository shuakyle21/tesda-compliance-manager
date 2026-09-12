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
 * Escapes the characters PostgreSQL `ILIKE` treats as pattern syntax, so an
 * address is matched literally.
 *
 * This is not cosmetic. `_` matches any single character and is common in real
 * addresses, so an unescaped lookup for `john_doe@example.com` also matches
 * `johnXdoe@example.com`. `findUserByEmail` takes the first row and
 * `assignUserAccess` then sets that profile's role and grants it a school —
 * so a wildcard match assigns access to the wrong person. Backslash first, or
 * it would escape the escapes added after it.
 *
 * PostgREST additionally reads `*` as `%` in a `like`/`ilike` pattern, and it
 * substitutes before Postgres sees the escape, so `*` cannot be escaped this
 * way. The exact-match check in `findUserByEmail` covers that residue.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

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

  const normalized = normalizeEmail(email);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, profile_tenant_memberships(tenant_id)')
      .ilike('email', escapeLikePattern(normalized))
      .limit(1);

    if (error) return { status: 'sync-failed', error: error.message };
    const row = data?.[0] as ProfileLookupRow | undefined;
    if (!row) return { status: 'not-registered' };

    // Belt and braces over the escaping above. Any pattern character that slips
    // through — `*`, which PostgREST rewrites before Postgres can escape it —
    // would return somebody else's row, and the caller assigns a role and a
    // school to whatever comes back. Confirming equality here makes the wrong
    // outcome "no match found" rather than "the wrong person was granted
    // access": the action then falls through to the invitation path, which
    // sends to the address the admin actually typed.
    if (normalizeEmail(row.email ?? '') !== normalized) return { status: 'not-registered' };

    return { status: 'found', user: mapExistingUserRow(row) };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Write.
// ---------------------------------------------------------------------------

/**
 * Puts a role back after a grant failed part-way through.
 *
 * Best effort by nature: there is no transaction to roll back, so this is a
 * second write that can itself fail. When it does, the state is what it would
 * have been without the attempt, and the log is the only trace — hence no
 * thrown error and no return value for the caller to branch on.
 */
async function restorePriorRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profileId: string,
  role: DbProfileRole,
): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);

  if (error) {
    console.error(
      'assignUserAccess: membership failed and the role could not be restored',
      error,
    );
  }
}

/** The caller's own Supabase client, threaded through the write helpers. */
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Either the profile to grant access to, or the snapshot to return instead. */
type AssignmentTarget =
  | { ok: true; user: ExistingUser }
  | { ok: false; snapshot: UserAssignmentSnapshot };

/** Looks the target up and restates a lookup snapshot as an assignment one. */
async function resolveAssignmentTarget(email: string): Promise<AssignmentTarget> {
  const lookup = await findUserByEmail(email);
  if (lookup.status === 'unconfigured') return { ok: false, snapshot: { status: 'unconfigured' } };
  if (lookup.status === 'sync-failed') {
    return { ok: false, snapshot: { status: 'sync-failed', error: lookup.error } };
  }
  if (lookup.status === 'not-registered') {
    return { ok: false, snapshot: { status: 'not-registered' } };
  }
  return { ok: true, user: lookup.user };
}

/**
 * Tells an RLS refusal apart from a real failure.
 *
 * Both writes below need this distinction and must draw it the same way: a
 * `with check` violation is `denied` (the caller may not do this), anything
 * else is `sync-failed` (the write broke). Only the message of the latter is
 * worth logging, and neither reaches the screen.
 */
function writeFailureSnapshot(error: { code?: string; message: string }): UserAssignmentSnapshot {
  if (error.code === RLS_VIOLATION) return { status: 'denied' };
  return { status: 'sync-failed', error: error.message };
}

/**
 * A name the admin typed fills a blank, but never overwrites one the person
 * already set on their own Clerk account.
 */
function fullNamePatch(
  command: UserAccessCommand,
  user: ExistingUser,
): { full_name?: string } {
  return command.fullName && !user.fullName ? { full_name: command.fullName } : {};
}

/**
 * The first of the two statements: set the role.
 *
 * Returns the snapshot to stop on, or `null` when the role is set and the
 * caller should carry on to the membership.
 */
async function setTargetRole(
  supabase: SupabaseServerClient,
  user: ExistingUser,
  command: UserAccessCommand,
): Promise<UserAssignmentSnapshot | null> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ role: UI_TO_DB_ROLE[command.role], ...fullNamePatch(command, user) })
    .eq('id', user.profileId)
    .select('id');

  if (error) return writeFailureSnapshot(error);
  // Zero rows means the policy's `using` clause excluded this row.
  if (!updated?.length) return { status: 'denied' };
  return null;
}

/**
 * The second statement: grant the school, undoing the role if it fails.
 *
 * Returns the snapshot to stop on, or `null` on success.
 */
async function grantMembership(
  supabase: SupabaseServerClient,
  user: ExistingUser,
  tenantId: string,
): Promise<UserAssignmentSnapshot | null> {
  const { error } = await supabase.from('profile_tenant_memberships').insert({
    profile_id: user.profileId,
    tenant_id: tenantId,
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

  if (!error) return null;

  // The role UPDATE already committed and PostgREST gives us no transaction
  // to roll it back with, so undo it explicitly: a grant that failed should
  // leave no trace of itself. This matters beyond tidiness — a half-applied
  // promotion to `admin` can read and set roles on every unassigned profile
  // (policies 1 and 2 of 20260904120000), so leaving the role behind widens
  // access the admin never finished granting.
  //
  // Reachable only when the target has no memberships, so policy 2 still
  // matches the row and this restore lands. Had they belonged to another
  // school, the original UPDATE would already have been denied.
  //
  // Best effort, not a transaction: if the restore fails we are exactly where
  // we would have been without it, and the log says so.
  await restorePriorRole(supabase, user.profileId, user.role);

  return writeFailureSnapshot(error);
}

/**
 * Sets a person's role and grants them a school.
 *
 * Two statements, not one transaction — PostgREST exposes no multi-statement
 * transaction, so ordering carries the safety instead. The role UPDATE runs
 * first because it is the safer half to stop after: if the membership INSERT
 * then fails, the person holds a changed role but no access to any *school*.
 * Granting access first and failing to set the role would leave someone
 * inside a school at whatever role they happened to have.
 *
 * Stopping there would still not be free, which is why the INSERT failure path
 * restores the prior role rather than leaving it. Policies 1 and 2 of
 * migration 20260904120000 are keyed on `current_role() = 'admin'` and match
 * profiles belonging to *no* tenant, so a half-applied promotion to `admin`
 * can read — and set roles on — the pool of unassigned profiles, with no
 * membership required. The compensating UPDATE closes that window.
 *
 * It is a compensation, not a transaction: if the restore itself fails the
 * state is what it would have been anyway, and it is logged. Real atomicity
 * would take a `SECURITY INVOKER` Postgres function so the table policies
 * still fire — the first `.rpc()` in this codebase, so it is a precedent to
 * set deliberately rather than in passing.
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

  const target = await resolveAssignmentTarget(command.email);
  if (!target.ok) return target.snapshot;

  const { user } = target;
  const alreadyMember = user.tenantIds.includes(command.tenantId);

  try {
    const supabase = await createSupabaseServerClient();

    const roleFailure = await setTargetRole(supabase, user, command);
    if (roleFailure) return roleFailure;

    if (alreadyMember) {
      return { status: 'assigned', profileId: user.profileId, alreadyMember: true };
    }

    const membershipFailure = await grantMembership(supabase, user, command.tenantId);
    if (membershipFailure) return membershipFailure;

    return { status: 'assigned', profileId: user.profileId, alreadyMember: false };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}
