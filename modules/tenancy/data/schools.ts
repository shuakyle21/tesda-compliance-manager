/**
 * School registry data layer (FR-02, ADR-006).
 *
 * `tenancy.ts` reads the signed-in person's own schools; `users.ts` grants
 * someone access to a school that exists. This file is what creates the
 * school in the first place, plus the national qualifications list the form
 * picks programs from.
 *
 * Every statement goes through `createSupabaseServerClient()` — the anon-key
 * client carrying the caller's Clerk token — so Postgres RLS decides what is
 * allowed (policies in migration 20260906114735). The service-role client is
 * deliberately not used: it bypasses RLS and belongs only to the Clerk
 * webhook, which has no session to scope by.
 *
 * Results are discriminated snapshots in the same shape as `BatchesSnapshot`
 * so callers map a status straight to UI, and no raw Supabase error, table
 * name or internal id ever reaches the screen.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import type { SchoolCommand } from '@/modules/tenancy/domain/schoolDraft';

type QualificationRow = Database['public']['Tables']['qualifications']['Row'];

const RLS_VIOLATION = '42501';
const UNIQUE_VIOLATION = '23505';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

// ---------------------------------------------------------------------------
// Qualifications — the national registry the form picks from.
// ---------------------------------------------------------------------------

/**
 * A qualification as the form needs it. The DB row and the UI shape are kept
 * apart on purpose (RULES.md sec.3): components never see `database.types`.
 */
export interface QualificationOption {
  id: string;
  code: string;
  title: string;
  ncLevel: string | null;
  sector: string | null;
  /** "Organic Agriculture Production NC II (AFFOAP212)" — what the option reads as. */
  label: string;
}

export type QualificationsSnapshot =
  | { status: 'ok'; qualifications: QualificationOption[] }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/**
 * Mapper — pure, no I/O. Unit-test this against a fixture row.
 *
 * The code goes in the label because two qualifications can share a title
 * across NC levels, and the code is what appears on the certificate the
 * operator is reading from.
 */
export function mapQualificationRow(row: QualificationRow): QualificationOption {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    ncLevel: row.nc_level,
    sector: row.sector,
    label: `${row.title} (${row.code})`,
  };
}

/**
 * Lists the active national qualifications.
 *
 * Readable by any signed-in user: this is public reference data, not tenant
 * data, so the policy is `is_active = true` rather than a tenant scope.
 */
export async function listQualifications(): Promise<QualificationsSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('qualifications')
      .select('id, code, title, nc_level, sector, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) return { status: 'sync-failed', error: error.message };

    return { status: 'ok', qualifications: (data ?? []).map(mapQualificationRow) };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Create — the write.
// ---------------------------------------------------------------------------

export type CreateSchoolResult =
  | { status: 'created'; tenantId: string }
  | { status: 'duplicate-code' }
  | { status: 'denied' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/**
 * Creates a school and its registered program list in one transaction.
 *
 * WHY THE RPC. A plain two-statement insert would leave a school with no
 * programs whenever the second statement failed — a school that cannot run a
 * batch, with nothing on screen to say so. `public.create_school` is
 * `security invoker`, so it buys atomicity without moving the security
 * boundary: RLS still evaluates every statement inside it, and a caller who
 * is not a platform admin gets a policy violation rather than a privilege.
 *
 * Three failures are told apart because they need three different screens:
 * `duplicate-code` the operator fixes themselves, `denied` means they are not
 * a platform admin, and `sync-failed` is everything else.
 */
export async function createSchool(command: SchoolCommand): Promise<CreateSchoolResult> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('create_school', {
      p_code: command.code,
      p_name: command.name,
      p_region: command.region,
      p_school_type: command.schoolType,
      p_tesda_provider_code: command.tesdaProviderCode,
      p_province: command.province,
      p_city_municipality: command.cityMunicipality,
      p_street_address: command.streetAddress,
      p_provider_type: command.providerType,
      p_provider_classification: command.providerClassification,
      p_qualifications: command.programs.map((program) => ({
        qualification_id: program.qualificationId,
        copr_number: program.coprNumber,
        registration_status: program.registrationStatus,
        delivery_mode: program.deliveryMode,
      })),
    });

    if (error) {
      if (error.code === RLS_VIOLATION) return { status: 'denied' };
      // `tenants.code` is the only unique constraint the operator can collide
      // with by typing — the (tenant_id, qualification_id) one is already
      // caught in `domain/schoolDraft.ts` before the write.
      if (error.code === UNIQUE_VIOLATION) return { status: 'duplicate-code' };
      return { status: 'sync-failed', error: error.message };
    }

    // The function `returns uuid`. A null here means the row did not land,
    // which must never read as success.
    if (typeof data !== 'string' || !data) {
      return { status: 'sync-failed', error: 'create_school returned no tenant id' };
    }

    return { status: 'created', tenantId: data };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}
