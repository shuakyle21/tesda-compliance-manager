/**
 * Write — create batches from a Notice to Proceed (TES-105, ADR-009 NTP1-NTP8).
 *
 * One call to the `create_batches_from_ntp` Postgres function, which writes the
 * batches, the school's AOU record (when supplied) and the `ntp` / `aou`
 * checklist rows in one transaction. It is `security invoker`, so RLS decides
 * who may write; nothing here filters by tenant beyond passing the validated
 * scope's id. Raw errors stay in the server log, never in the result.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { NtpBatchInput } from '@/modules/batches/domain/ntp';

export type NtpBatchRow = NtpBatchInput & { id: string };

export type CreateBatchesResult =
  | { status: 'created'; batchIds: string[] }
  | { status: 'duplicate' }
  | { status: 'unknown-program'; codes: string }
  | { status: 'aou-required'; year: number }
  /** RLS refused the write, or the function rejected the input. Indistinguishable on purpose. */
  | { status: 'refused' }
  | { status: 'sync-failed' }
  | { status: 'unconfigured' };

const UNIQUE_VIOLATION = '23505';

type DbError = { code?: string; message?: string; details?: string | null };

function mapError(error: DbError): CreateBatchesResult {
  if (error.code === UNIQUE_VIOLATION) return { status: 'duplicate' };
  switch (error.message) {
    case 'ntp:unknown-program':
      return { status: 'unknown-program', codes: error.details ?? '' };
    case 'ntp:aou-required':
      return { status: 'aou-required', year: Number(error.details) };
    case 'ntp:no-rows':
    case 'ntp:bad-dates':
    case 'ntp:bad-path':
    case 'ntp:bad-row':
      return { status: 'refused' };
  }
  // 42501 = insufficient privilege: an RLS refusal.
  if (error.code === '42501') return { status: 'refused' };
  console.error('createBatchesFromNtp failed', error);
  return { status: 'sync-failed' };
}

export async function createBatchesFromNtp(args: {
  tenantId: string;
  receiptDate: string;
  ntpDate: string;
  approvalDate: string;
  ntpPath: string;
  aouPath: string | null;
  rows: NtpBatchRow[];
}): Promise<CreateBatchesResult> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_batches_from_ntp', {
      p_tenant_id: args.tenantId,
      p_receipt_date: args.receiptDate,
      p_ntp_date: args.ntpDate,
      p_ntp_approval_date: args.approvalDate,
      p_ntp_path: args.ntpPath,
      p_aou_path: args.aouPath,
      p_rows: args.rows.map((r) => ({
        id: r.id,
        rqm_code: r.rqmCode,
        program_code: r.programCode,
        qualification_title: r.qualificationTitle,
        approved_slots: r.approvedSlots,
        total_amount: r.totalAmount,
        indicative_start_date: r.indicativeStartDate,
      })),
    });
    if (error) return mapError(error);
    return { status: 'created', batchIds: data ?? [] };
  } catch (err) {
    console.error('createBatchesFromNtp failed', err);
    return { status: 'sync-failed' };
  }
}
