/**
 * Clerk → `profiles` provisioning — writes driven by Clerk webhook events.
 *
 * These run with the service-role Supabase client (no Clerk session exists
 * yet for `user.created`/`user.deleted`), so callers must be limited to the
 * Clerk webhook route handler. A user who signs themselves up gets the
 * least-privileged role and no tenant membership: this repo's sign-up flow
 * already tells users "your registrar will assign your school and role" (see
 * `modules/auth/ui/SignUpModal.tsx`), so provisioning creates only the row an
 * admin later assigns — self sign-up must never grant tenant access.
 *
 * The single exception is a user arriving through an admin's invitation,
 * which carries the grant the admin already chose. That is still an admin
 * assignment, just one made before the account existed; the safety argument
 * for trusting it is in `modules/auth/domain/invitationMetadata.ts`.
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { parseInvitationGrant } from '@/modules/auth/domain/invitationMetadata';

/** Postgres `unique_violation`. A concurrent delivery beat us to the insert. */
const UNIQUE_VIOLATION = '23505';

type ClerkUserSummary = {
  id: string;
  email: string | null;
  fullName: string | null;
  /**
   * The Clerk user's `publicMetadata`. Backend-API-only, so on a user created
   * from an invitation this is the grant the inviting admin authored. Absent
   * for a self sign-up.
   */
  publicMetadata?: unknown;
};

/**
 * Creates or updates the `profiles` row for a Clerk user.
 *
 * Insert path (new `clerk_user_id`): role comes from an invitation grant when
 * one is present and parses, and otherwise defaults to `viewer`, the least
 * privileged role. A tenant membership is created only for a grant — a self
 * sign-up still lands with no tenant access at all.
 *
 * Update path (existing `clerk_user_id`): syncs `full_name`/`email`, then
 * repairs a missing invitation membership (see `ensureTenantMembership`).
 * Role and `is_active` stay admin-managed in the app and are never touched
 * here, so no Clerk profile edit can change what a person *is* allowed to do.
 *
 * The membership repair narrows that invariant rather than holding it whole,
 * so state it exactly: a membership is written only when the profile holds
 * *none*, so a grant can never add a second school or move someone an admin
 * has already placed. What it does allow is an admin authoring a grant onto an
 * existing tenantless user through Clerk's Backend API and having it applied.
 * That is the same actor and the same intent the invitation path already
 * trusts — an admin's assignment, made outside the app — and `publicMetadata`
 * is Backend-API-only, so the person signing up cannot forge it.
 */
export async function upsertProfileFromClerkUser(user: ClerkUserSummary): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  // Parsed before the branch because both paths need it: the insert path to
  // apply the grant, the update path to repair one that failed to apply.
  const grant = parseInvitationGrant(user.publicMetadata);

  if (existing) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: user.fullName, email: user.email })
      .eq('clerk_user_id', user.id);

    if (updateError) throw updateError;

    // The repair channel. A membership insert that failed on `user.created`
    // used to be permanent: it logged, the route still answered 200, so Clerk
    // never retried — and every later delivery returned right here without
    // looking at the grant. `user.updated` routes to this same function, so
    // the next delivery now closes the gap instead of stepping over it.
    if (grant) await ensureTenantMembership(existing.id, grant.tenantId);
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      clerk_user_id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: grant?.role ?? 'viewer',
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  if (!grant || !inserted) return;

  await ensureTenantMembership(inserted.id, grant.tenantId);
}

/**
 * Grants a profile its invitation school, if it has no school yet.
 *
 * Shared by both paths of `upsertProfileFromClerkUser` so that creating the
 * membership and repairing a missing one behave identically.
 *
 * **Never throws.** A membership failure must not fail the whole webhook: the
 * `profiles` row already exists by this point, and a non-2xx makes Clerk retry
 * an insert whose `clerk_user_id` is now taken — trading a missing school for
 * a redelivery that can never succeed. The person instead lands with their
 * role and no school, which an admin sees as an unassigned user and can fix
 * from the create-user screen. Logged, so the gap is never silent, and now
 * self-healing: the next `user.updated` delivery retries this.
 *
 * The zero-membership gate is what makes the write safe to repeat. It also
 * makes `is_default: true` correct by construction — true is right exactly
 * when there are no others, which is the condition being checked.
 * `modules/tenancy/data/users.ts` has to write `false` for precisely the
 * opposite reason: its client is RLS-scoped, so an empty membership list there
 * means "none this admin can see", not "none". Here the service-role client
 * bypasses RLS, so the count is the whole truth and can be acted on.
 */
async function ensureTenantMembership(profileId: string, tenantId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existingMemberships, error: readError } = await supabase
    .from('profile_tenant_memberships')
    .select('id')
    .eq('profile_id', profileId)
    .limit(1);

  if (readError) {
    console.error(
      `Clerk invitation grant: could not read memberships for profile "${profileId}"`,
      readError,
    );
    return;
  }

  // Already has a school. Either this grant landed the first time, or an admin
  // has since assigned one — and overwriting an admin's assignment from Clerk
  // metadata is exactly what this must not do.
  if (existingMemberships && existingMemberships.length > 0) return;

  const { error: insertError } = await supabase.from('profile_tenant_memberships').insert({
    profile_id: profileId,
    tenant_id: tenantId,
    // Their only school, so it is also where they land.
    is_default: true,
  });

  // `unique (tenant_id, profile_id)` on the table means a concurrent delivery
  // that won the race shows up here as a duplicate-key violation. That is the
  // desired end state, not a failure, so it is not worth logging.
  if (insertError && insertError.code !== UNIQUE_VIOLATION) {
    console.error(
      `Clerk invitation grant: tenant membership failed for profile "${profileId}"`,
      insertError,
    );
  }
}

/**
 * Deactivates (never deletes) the `profiles` row for a deleted Clerk user.
 *
 * A hard delete would cascade or orphan every FK that references
 * `profiles.id` (batches, documents, activity_log, …) and destroy the
 * compliance audit trail. `is_active = false` matches how
 * `app_private.current_profile_id()` already excludes inactive profiles
 * from every RLS check, so a deactivated profile immediately loses access
 * without losing its history.
 */
export async function deactivateProfileFromClerkUser(clerkUserId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('clerk_user_id', clerkUserId);

  if (error) throw error;
}
