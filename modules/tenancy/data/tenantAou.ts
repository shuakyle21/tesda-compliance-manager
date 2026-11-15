/**
 * The school's Affidavit of Undertaking records (ADR-009 AOU1) — fetch only.
 *
 * Rows are written by the `create_batches_from_ntp` database function, never
 * here. RLS scopes the read; the `tenant_id` filter is scope selection from a
 * validated `TenantScope`, not access control.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

export type AouYearsSnapshot =
  | { status: 'ok'; years: number[] }
  | { status: 'sync-failed' }
  | { status: 'unconfigured' };

/** The fiscal years for which the school has an AOU on file. */
export async function getAouYears(tenantId: string): Promise<AouYearsSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('tenant_aou').select('fiscal_year').eq('tenant_id', tenantId);
    if (error) {
      console.error('getAouYears failed', error);
      return { status: 'sync-failed' };
    }
    return { status: 'ok', years: (data ?? []).map((r) => r.fiscal_year) };
  } catch (err) {
    console.error('getAouYears failed', err);
    return { status: 'sync-failed' };
  }
}
