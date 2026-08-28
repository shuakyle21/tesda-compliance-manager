/**
 * Tenancy data layer (FR-02) — profile + tenant-membership fetch/map.
 *
 * First `data/` file this module gets (live-data cutover, Phase 1). Mirrors
 * `modules/batches/data/batches.ts`'s fetch → map → derive → snapshot pattern
 * so callers handle it the same way as every other module.
 *
 * Cross-module note: the `profiles` RLS policy allows reading "own or
 * same-tenant" rows (migration ~line 475), not just the caller's own row —
 * so getting "my profile" specifically needs the caller's Clerk user id as an
 * explicit filter, not just an unfiltered select. Resolving that id is
 * `modules/auth/data`'s job, and that module's `data/` is private to it per
 * the import-direction rule — so this file takes the id as a parameter
 * instead of importing across the boundary.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database, ProfileRole as DbProfileRole } from '@/lib/supabase/database.types';
import type { Tenant, UserRole } from '@/shared/types';
import type { Profile } from '@/modules/tenancy/domain/profile';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TenantRow = Database['public']['Tables']['tenants']['Row'];
type MembershipRow = Database['public']['Tables']['profile_tenant_memberships']['Row'];

type ProfileRowWithTenants = ProfileRow & {
  profile_tenant_memberships:
    | (Pick<MembershipRow, 'is_default'> & { tenants: TenantRow | null })[]
    | null;
};

// DB role is a strict subset of the UI's UserRole ('owner' has no DB
// equivalent yet). A total map so a new DB enum variant fails compilation
// here until its UI treatment is chosen, same convention as batches.ts's
// DB_TO_UI_STAGE.
const DB_TO_UI_ROLE: Record<DbProfileRole, UserRole> = {
  admin: 'admin',
  coordinator: 'coordinator',
  trainer: 'trainer',
  viewer: 'viewer',
};

function mapTenantRow(row: TenantRow): Tenant {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    region: row.region ?? '',
    type: row.school_type ?? '',
    // TODO(contract): no DB columns for these — UI-only decoration/rollups
    // the seed mock invents. Defaulted so the shape stays valid.
    color: '',
    plan: '',
    activeBatches: 0,
    totalScholars: 0,
  };
}

// ---------------------------------------------------------------------------
// Mapper — pure, no I/O. Unit-test this against a fixture row.
// ---------------------------------------------------------------------------
export function mapProfileRow(row: ProfileRowWithTenants): Profile {
  const memberships = row.profile_tenant_memberships ?? [];
  const tenants = memberships
    .map((m) => m.tenants)
    .filter((t): t is TenantRow => t !== null)
    .map(mapTenantRow);
  const defaultMembership = memberships.find((m) => m.is_default) ?? memberships[0];

  return {
    clerkUserId: row.clerk_user_id,
    fullName: row.full_name,
    email: row.email,
    role: DB_TO_UI_ROLE[row.role],
    tenants,
    defaultTenantId: defaultMembership?.tenants?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetch — server-only.
// ---------------------------------------------------------------------------

/**
 * Outcome of a profile load, same discriminated-union shape as
 * `BatchesSnapshot` plus one addition:
 *   - `ok`           — a profile row exists; mapped and ready to use.
 *   - `not-found`    — the caller is authenticated with Clerk but has no
 *                      `profiles` row yet. Distinct from an error: this is
 *                      the expected state for a brand-new sign-in, and it's
 *                      what the not-yet-built upsert-on-sign-in step (Phase 1
 *                      feature 2) will look for to know when to provision one.
 *   - `sync-failed`  — Supabase is configured but the query failed.
 *   - `unconfigured` — no Supabase env in this environment.
 */
export type ProfileSnapshot =
  | { status: 'ok'; profile: Profile }
  | { status: 'not-found' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

export async function getProfileSnapshot(clerkUserId: string): Promise<ProfileSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*, profile_tenant_memberships(is_default, tenants(*))')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (error) return { status: 'sync-failed', error: error.message };
    if (!data) return { status: 'not-found' };

    return { status: 'ok', profile: mapProfileRow(data as ProfileRowWithTenants) };
  } catch (err) {
    // Network / client-construction failures land here, not in `error` above.
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}

/**
 * A brand-new profiles row starts with no tenant and the least-privileged
 * role, matching the rest of the app's "unknown → fall back to the
 * least-privileged variant" convention (see modules/auth/data/role.ts).
 * Tenant assignment and any role upgrade past this are admin actions, done
 * later, not part of signing in — see the "Users can insert their own
 * profile" migration this depends on for the matching write-side rule.
 */
const DEFAULT_ROLE_FOR_NEW_PROFILE: DbProfileRole = 'viewer';

/**
 * Ensures a `profiles` row exists for this Clerk user, creating one with no
 * tenant membership if this is their first sign-in. Idempotent: called again
 * for an existing profile, it just returns that profile unchanged.
 *
 * Only inserts — never touches `profile_tenant_memberships` or upgrades an
 * existing row's role. A user assigned to zero tenants after this is a valid,
 * expected state (a real person waiting on an admin to grant access), not an
 * error; callers should treat `tenants: []` in the returned `AuthProfile` as
 * "no access yet", not as `sync-failed`.
 */
export async function ensureProfile(
  clerkUserId: string,
  email: string | null,
  fullName: string | null,
): Promise<ProfileSnapshot> {
  const existing = await getProfileSnapshot(clerkUserId);
  if (existing.status !== 'not-found') return existing;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('profiles').insert({
      clerk_user_id: clerkUserId,
      email,
      full_name: fullName,
      role: DEFAULT_ROLE_FOR_NEW_PROFILE,
    });

    if (error) return { status: 'sync-failed', error: error.message };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }

  // Re-fetch so the caller gets the same shape (with memberships joined)
  // whether the profile already existed or was just created above.
  return getProfileSnapshot(clerkUserId);
}
