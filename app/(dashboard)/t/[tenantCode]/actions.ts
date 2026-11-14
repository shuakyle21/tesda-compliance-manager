'use server';

/**
 * Server Action — set, replace or clear a batch's RQM code (the TESDA Notice
 * to Proceed authorization code).
 *
 * Same shape as `schools/new/actions.ts` and `users/new/actions.ts`: validate
 * through a module's `domain/`, write through a module's `data/`, return a
 * discriminated state, never throw. It lives in `app/` because it composes
 * three modules' data layers (tenancy scope, batches, activity), which cannot
 * import each other.
 *
 * SECURITY. Everything in the form is untrusted. The school is resolved on the
 * server from the URL code against the caller's own memberships — no tenant id
 * is ever read from the form — and the role comes from `profiles.role` via
 * `resolveTrustedRole`, never the `?role=` preview override. Those checks are
 * defence in depth and usability; the boundary is the `batches` UPDATE policy
 * (admin/coordinator of the tenant only), which for anyone else matches zero
 * rows — surfaced by the data layer as `conflict-or-denied`.
 */

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { appendActivity } from '@/modules/activity/data/activity';
import { getBatchesSnapshot, setBatchRqmCode, type SetRqmResult } from '@/modules/batches/data/batches';
import { createBatchesFromNtp, type CreateBatchesResult } from '@/modules/batches/data/createBatches';
import { checkRqmCode, type RqmFormState } from '@/modules/batches/domain/rqm';
import { manilaToday, validateNtpSubmission, type NtpDraftRow, type NtpFormState } from '@/modules/batches/domain/ntp';
import { uploadEvidence, type EvidenceUploadResult } from '@/modules/documents/data/evidence';
import {
  EVIDENCE_REJECTION_COPY,
  evidenceExtensionOf,
  evidenceMimeOf,
  validateEvidenceFile,
} from '@/modules/documents/domain/evidencePath';
import { getAouYears } from '@/modules/tenancy/data/tenantAou';
import { aouOnFile, fiscalYearOf } from '@/modules/tenancy/domain/aou';
import type { Profile } from '@/modules/tenancy/domain/profile';
import type { TenantScope } from '@/modules/tenancy/domain/scope';
import { resolveRouteScope } from '../../tenant-scope';

const DENIED: RqmFormState = { status: 'denied' };
const SAVE_FAILED: RqmFormState = { status: 'error', message: "The code couldn't be saved. Try again." };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function activitySummary(from: string | null, to: string | null): string {
  if (from && to) return `RQM code changed from ${from} to ${to}`;
  if (to) return `RQM code set to ${to}`;
  return `RQM code cleared (was ${from})`;
}

type Validated =
  | { ok: true; next: string | null; warnings: string[] }
  | { ok: false; state: RqmFormState };

/** Turns the typed value into the code to store; an empty field means "clear". */
async function validateInput(
  input: string,
  batchCode: string,
  expectedPrevious: string | null,
  scope: TenantScope,
  profile: Profile,
): Promise<Validated> {
  if (!input.trim()) {
    if (expectedPrevious) return { ok: true, next: null, warnings: [] };
    return { ok: false, state: { status: 'invalid', message: 'Enter the RQM code from the Notice to Proceed.' } };
  }

  const snapshot = await getBatchesSnapshot(scope.tenantId);
  if (snapshot.status !== 'ok') return { ok: false, state: SAVE_FAILED };
  const batch = snapshot.batches.find((b) => b.id === batchCode);
  if (!batch) return { ok: false, state: { status: 'error', message: 'Batch not found.' } };

  const providerCode = profile.tenants.find((t) => t.id === scope.tenantId)?.tesdaProviderCode ?? null;
  const checked = checkRqmCode(input, { program: batch.program, providerCode });
  if (!checked.ok) return { ok: false, state: { status: 'invalid', message: checked.error } };
  return { ok: true, next: checked.code, warnings: checked.warnings };
}

/** The failure state for a write that did not save; null when it saved. */
function failureState(result: SetRqmResult): RqmFormState | null {
  switch (result.status) {
    case 'saved':
      return null;
    case 'duplicate':
      return { status: 'invalid', message: 'This RQM code is already recorded on another batch in this school.' };
    case 'conflict-or-denied':
      return {
        status: 'error',
        message: "The code wasn't saved. It may have just been changed by someone else, or you may not have permission. Reload and try again.",
      };
    case 'sync-failed':
    case 'unconfigured':
      return SAVE_FAILED;
  }
}

export async function setBatchRqmCodeAction(
  _previous: RqmFormState,
  formData: FormData,
): Promise<RqmFormState> {
  const tenantCode = text(formData, 'tenantCode');
  const batchCode = text(formData, 'batchCode');
  const expectedPrevious = text(formData, 'expectedPrevious').trim() || null;
  const source = text(formData, 'source') === 'ntp-pdf' ? 'ntp-pdf' : 'manual';

  // Which school, and is the caller a member? Resolved here, from the URL code.
  const resolved = await resolveRouteScope(tenantCode);
  // `unknown` = the profile could not be read: a failure to check, not a refusal.
  if (resolved.status === 'unknown') return SAVE_FAILED;
  if (resolved.status !== 'ok') return DENIED;
  const { scope, profile } = resolved;

  const role = await resolveTrustedRole(profile.role);
  if (role !== 'admin' && role !== 'coordinator') return DENIED;

  const input = await validateInput(text(formData, 'rqmCode'), batchCode, expectedPrevious, scope, profile);
  if (!input.ok) return input.state;

  const result = await setBatchRqmCode({ tenantId: scope.tenantId, batchCode, expectedPrevious, next: input.next });
  const failure = failureState(result);
  if (failure) return failure;
  if (result.status !== 'saved') return SAVE_FAILED; // unreachable; narrows `result` for the fields below

  // Re-saving the same value changes nothing, so it is not worth a log entry.
  const logged =
    result.from === result.to
      ? { ok: true }
      : await appendActivity({
          tenantId: scope.tenantId,
          batchId: result.batchUuid,
          profileId: profile.id,
          action: 'updated',
          entityType: 'batch',
          entityId: result.batchUuid,
          summary: activitySummary(result.from, result.to),
          metadata: { field: 'rqm_code', from: result.from, to: result.to, source },
        });

  // The layout carries the KPI row and every list under it shows the code.
  revalidatePath('/t/[tenantCode]', 'layout');

  return { status: 'saved', code: result.to, warnings: input.warnings, logFailed: !logged.ok };
}

// ---------------------------------------------------------------------------
// Create batches from a Notice to Proceed (TES-105, ADR-009 NTP1-NTP8).
//
// Same security shape as above: school from the URL code, role from
// `profiles.role`, every field re-validated through `modules/batches/domain/ntp`.
// The files are stored FIRST, then one database transaction writes the batches,
// the school's AOU record (when attached) and the checklist rows (NTP8), so a
// failed upload writes nothing. The boundary is RLS on every table the
// `security invoker` function touches.
// ---------------------------------------------------------------------------

const NTP_DENIED: NtpFormState = { status: 'denied' };
const NTP_SAVE_FAILED: NtpFormState = { status: 'error', message: "The batches couldn't be saved. Nothing was saved. Try again." };

const invalid = (message: string): NtpFormState => ({ status: 'invalid', message });

/** The rows field is JSON from our own modal; anything else is treated as empty. */
function draftRows(raw: string): NtpDraftRow[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '');
      return {
        rqmCode: s('rqmCode'),
        qualification: s('qualification'),
        approvedSlots: s('approvedSlots'),
        totalAmount: s('totalAmount'),
        indicativeStartDate: s('indicativeStartDate'),
      };
    });
  } catch {
    return [];
  }
}

function attachedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

/** A file as Storage will receive it, or the copy saying why it can't be. */
function checkedFile(file: File, opts: { pdfOnly: boolean; label: string }): { mimeType: string } | { error: string } {
  const mimeType = evidenceMimeOf(file);
  if (opts.pdfOnly && mimeType !== 'application/pdf') return { error: `The ${opts.label} must be a PDF.` };
  const checked = validateEvidenceFile({ size: file.size, mimeType });
  return checked.ok ? { mimeType } : { error: EVIDENCE_REJECTION_COPY[checked.reason] };
}

function uploadFailure(result: EvidenceUploadResult): NtpFormState {
  return result.status === 'rejected' ? invalid(EVIDENCE_REJECTION_COPY[result.reason]) : NTP_SAVE_FAILED;
}

function createFailure(result: Exclude<CreateBatchesResult, { status: 'created' }>): NtpFormState {
  switch (result.status) {
    case 'duplicate':
      return invalid('One of these RQM codes is already recorded on a batch in this school.');
    case 'unknown-program':
      return invalid(`This Notice to Proceed has a program that is not set up in the app: ${result.codes}.`);
    case 'aou-required':
      return { status: 'aou-required', year: result.year };
    case 'refused':
      return { status: 'error', message: "The batches weren't saved. You may not have permission, or the page is out of date. Reload and try again." };
    case 'sync-failed':
    case 'unconfigured':
      return NTP_SAVE_FAILED;
  }
}

export async function createBatchesFromNtpAction(_previous: NtpFormState, formData: FormData): Promise<NtpFormState> {
  const resolved = await resolveRouteScope(text(formData, 'tenantCode'));
  if (resolved.status === 'unknown') return NTP_SAVE_FAILED;
  if (resolved.status !== 'ok') return NTP_DENIED;
  const { scope, profile } = resolved;

  const role = await resolveTrustedRole(profile.role);
  if (role !== 'admin' && role !== 'coordinator') return NTP_DENIED;

  const submission = validateNtpSubmission(
    {
      receiptDate: text(formData, 'receiptDate'),
      ntpDate: text(formData, 'ntpDate'),
      approvalDate: text(formData, 'approvalDate'),
      rows: draftRows(text(formData, 'rows')),
    },
    manilaToday(new Date()),
  );
  if (!submission.ok) return invalid(submission.error);
  const { receiptDate, ntpDate, approvalDate, rows } = submission.value;

  const ntpFile = attachedFile(formData, 'ntpFile');
  if (!ntpFile) return invalid('Choose the Notice to Proceed PDF.');
  const ntp = checkedFile(ntpFile, { pdfOnly: true, label: 'Notice to Proceed' });
  if ('error' in ntp) return invalid(ntp.error);

  // The school's AOU for the receipt date's fiscal year (ADR-009 AOU2).
  const years = await getAouYears(scope.tenantId);
  if (years.status !== 'ok') return NTP_SAVE_FAILED;
  const year = fiscalYearOf(receiptDate);
  const aouFile = aouOnFile(years.years, receiptDate) ? null : attachedFile(formData, 'aouFile');
  if (!aouOnFile(years.years, receiptDate) && !aouFile) return { status: 'aou-required', year };
  const aou = aouFile ? checkedFile(aouFile, { pdfOnly: false, label: 'Affidavit of Undertaking' }) : null;
  if (aou && 'error' in aou) return invalid(aou.error);

  // Ids are made here so the files can be stored before any row exists.
  const withIds = rows.map((r) => ({ ...r, id: randomUUID() }));
  const first = withIds[0]!;

  const ntpUpload = await uploadEvidence({
    tenantId: scope.tenantId,
    batchId: first.id,
    documentKey: 'ntp',
    filename: `NTP-${first.rqmCode}.pdf`,
    body: ntpFile,
    size: ntpFile.size,
    mimeType: ntp.mimeType,
  });
  if (ntpUpload.status !== 'ok') return uploadFailure(ntpUpload);

  let aouPath: string | null = null;
  if (aouFile && aou && 'mimeType' in aou) {
    const ext = evidenceExtensionOf(aou.mimeType);
    const aouUpload = await uploadEvidence({
      tenantId: scope.tenantId,
      batchId: first.id,
      documentKey: 'aou',
      filename: ext ? `AOU-${year}.${ext}` : `AOU-${year}`,
      body: aouFile,
      size: aouFile.size,
      mimeType: aou.mimeType,
    });
    if (aouUpload.status !== 'ok') return uploadFailure(aouUpload);
    aouPath = aouUpload.path;
  }

  // shortcut: a refused save leaves the uploaded files unreferenced; TES-107 removes them.
  const created = await createBatchesFromNtp({
    tenantId: scope.tenantId,
    receiptDate,
    ntpDate,
    approvalDate,
    ntpPath: ntpUpload.path,
    aouPath,
    rows: withIds,
  });
  if (created.status !== 'created') return createFailure(created);

  const codes = withIds.map((r) => r.rqmCode);
  const logged = await appendActivity({
    tenantId: scope.tenantId,
    batchId: first.id,
    profileId: profile.id,
    action: 'created',
    entityType: 'batch',
    entityId: first.id,
    summary: `${codes.length === 1 ? 'Batch' : `${codes.length} batches`} created from a Notice to Proceed: ${codes.join(', ')}`,
    metadata: { source: 'ntp-pdf', rqm_codes: codes, ntp_received_date: receiptDate, aou_recorded: aouPath !== null },
  });

  revalidatePath('/t/[tenantCode]', 'layout');
  return { status: 'saved', codes, logFailed: !logged.ok };
}
