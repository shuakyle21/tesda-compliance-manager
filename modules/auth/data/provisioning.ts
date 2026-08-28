/**
 * Clerk → `profiles` provisioning — writes driven by Clerk webhook events.
 *
 * These run with the service-role Supabase client (no Clerk session exists
 * yet for `user.created`/`user.deleted`), so callers must be limited to the
 * Clerk webhook route handler. New profiles get the least-privileged role
 * and no tenant membership: this repo's sign-up flow already tells users
 * "your registrar will assign your school and role" (see
 * `modules/auth/ui/SignUpModal.tsx`), so provisioning here only creates the
 * row an admin later assigns — it must never grant tenant access itself.
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service';

type ClerkUserSummary = {
  id: string;
  email: string | null;
  fullName: string | null;
};

/**
 * Creates or updates the `profiles` row for a Clerk user.
 *
 * Insert path (new `clerk_user_id`): role defaults to `viewer`, the least
 * privileged role, and no `profile_tenant_memberships` row is created —
 * the user has no tenant access until an admin assigns one.
 *
 * Update path (existing `clerk_user_id`): only syncs `full_name`/`email`.
 * Role and `is_active` are admin-managed in the app and are left untouched
 * here so a Clerk profile edit can never change app-side authorization.
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

  const { error: insertError } = await supabase.from('profiles').insert({
    clerk_user_id: user.id,
    full_name: user.fullName,
    email: user.email,
    role: 'viewer',
    is_active: true,
  });

  if (insertError) throw insertError;
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
