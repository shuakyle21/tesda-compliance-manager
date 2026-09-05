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
 * Update path (existing `clerk_user_id`): only syncs `full_name`/`email`.
 * Role and `is_active` are admin-managed in the app and are left untouched
 * here, so neither a Clerk profile edit nor metadata appearing on an existing
 * user can change app-side authorization after the fact.
 */
export async function upsertProfileFromClerkUser(user: ClerkUserSummary): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: user.fullName, email: user.email })
      .eq('clerk_user_id', user.id);

    if (updateError) throw updateError;
    return;
  }

  const grant = parseInvitationGrant(user.publicMetadata);

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

  const { error: membershipError } = await supabase.from('profile_tenant_memberships').insert({
    profile_id: inserted.id,
    tenant_id: grant.tenantId,
    // Their only school on arrival, so it is also where they land.
    is_default: true,
  });

  // A failed membership insert must not fail the whole webhook: the profile
  // row already exists and Clerk would retry the event, re-running an insert
  // whose `clerk_user_id` is now taken. The person lands with their role but
  // no school — visible to an admin as an unassigned user and fixable from
  // the create-user screen, which is a far better failure than a profile that
  // never gets created at all. Logged so the gap is not silent.
  if (membershipError) {
    console.error(
      `Clerk invitation grant: profile created for "${user.id}" but tenant membership failed`,
      membershipError,
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
