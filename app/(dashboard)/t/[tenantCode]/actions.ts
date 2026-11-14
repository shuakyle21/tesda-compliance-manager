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
import { draftRowsFromJson, manilaToday, validateNtpSubmission, type NtpFormState, type NtpSubmission } from '@/modules/batches/domain/ntp';
import { uploadEvidence, type EvidenceUploadResult } from '@/modules/documents/data/evidence';
import { EVIDENCE_REJECTION_COPY, checkPickedEvidence, evidenceExtensionOf } from '@/modules/documents/domain/evidencePath';
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

function attachedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

/** The first bytes, so a non-PDF renamed to .pdf is caught by its content, not its name. */
async function headOf(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, 8).arrayBuffer());
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

/** A step that either yields a value or stops the action with a modal state. */
type Step<T> = { ok: true; value: T } | { ok: false; state: NtpFormState };
const stop = (state: NtpFormState): { ok: false; state: NtpFormState } => ({ ok: false, state });

type PickedFile = { file: File; mimeType: string };

/** The school from the URL code, and an admin or coordinator of it. */
async function authorizeCreate(tenantCode: string): Promise<Step<{ scope: TenantScope; profile: Profile }>> {
  const resolved = await resolveRouteScope(tenantCode);
  if (resolved.status === 'unknown') return stop(NTP_SAVE_FAILED);
  if (resolved.status !== 'ok') return stop(NTP_DENIED);
  const role = await resolveTrustedRole(resolved.profile.role);
  if (role !== 'admin' && role !== 'coordinator') return stop(NTP_DENIED);
  return { ok: true, value: { scope: resolved.scope, profile: resolved.profile } };
}

/** The rows and dates, re-validated through the domain, and the NTP file. */
async function readSubmission(formData: FormData): Promise<Step<{ submission: NtpSubmission; ntp: PickedFile }>> {
  const checked = validateNtpSubmission(
    {
      receiptDate: text(formData, 'receiptDate'),
      ntpDate: text(formData, 'ntpDate'),
      approvalDate: text(formData, 'approvalDate'),
      rows: draftRowsFromJson(text(formData, 'rows')),
    },
    manilaToday(new Date()),
  );
  if (!checked.ok) return stop(invalid(checked.error));
  const file = attachedFile(formData, 'ntpFile');
  if (!file) return stop(invalid('Choose the Notice to Proceed PDF.'));
  const ntp = checkPickedEvidence(file, { pdfOnly: true, label: 'Notice to Proceed', head: await headOf(file) });
  if (!ntp.ok) return stop(invalid(ntp.message));
  return { ok: true, value: { submission: checked.value, ntp: { file, mimeType: ntp.mimeType } } };
}

/** The AOU file to store: none when one is on file for the receipt year, else the attached one (ADR-009 AOU2). */
async function aouToStore(tenantId: string, receiptDate: string, formData: FormData): Promise<Step<PickedFile | null>> {
  const years = await getAouYears(tenantId);
  if (years.status !== 'ok') return stop(NTP_SAVE_FAILED);
  if (aouOnFile(years.years, receiptDate)) return { ok: true, value: null };
  const file = attachedFile(formData, 'aouFile');
  if (!file) return stop({ status: 'aou-required', year: fiscalYearOf(receiptDate) });
  const aou = checkPickedEvidence(file, { pdfOnly: false, label: 'Affidavit of Undertaking', head: await headOf(file) });
  if (!aou.ok) return stop(invalid(aou.message));
  return { ok: true, value: { file, mimeType: aou.mimeType } };
}

async function store(tenantId: string, batchId: string, documentKey: 'ntp' | 'aou', filename: string, picked: PickedFile): Promise<Step<string>> {
  const result = await uploadEvidence({ tenantId, batchId, documentKey, filename, body: picked.file, size: picked.file.size, mimeType: picked.mimeType });
  return result.status === 'ok' ? { ok: true, value: result.path } : stop(uploadFailure(result));
}

/** Stores the files under the first batch id, NTP first (ADR-009 NTP8). */
async function storeFiles(
  tenantId: string,
  first: { id: string; rqmCode: string },
  year: number,
  ntp: PickedFile,
  aou: PickedFile | null,
): Promise<Step<{ ntpPath: string; aouPath: string | null }>> {
  const ntpPath = await store(tenantId, first.id, 'ntp', `NTP-${first.rqmCode}.pdf`, ntp);
  if (!ntpPath.ok) return ntpPath;
  if (!aou) return { ok: true, value: { ntpPath: ntpPath.value, aouPath: null } };
  const ext = evidenceExtensionOf(aou.mimeType);
  const aouPath = await store(tenantId, first.id, 'aou', ext ? `AOU-${year}.${ext}` : `AOU-${year}`, aou);
  return aouPath.ok ? { ok: true, value: { ntpPath: ntpPath.value, aouPath: aouPath.value } } : aouPath;
}

export async function createBatchesFromNtpAction(_previous: NtpFormState, formData: FormData): Promise<NtpFormState> {
  const who = await authorizeCreate(text(formData, 'tenantCode'));
  if (!who.ok) return who.state;
  const { scope, profile } = who.value;

  const request = await readSubmission(formData);
  if (!request.ok) return request.state;
  const { submission, ntp } = request.value;

  const aou = await aouToStore(scope.tenantId, submission.receiptDate, formData);
  if (!aou.ok) return aou.state;

  // Ids are made here so the files can be stored before any row exists.
  const rows = submission.rows.map((r) => ({ ...r, id: randomUUID() }));
  const first = rows[0]!;
  const files = await storeFiles(scope.tenantId, first, fiscalYearOf(submission.receiptDate), ntp, aou.value);
  if (!files.ok) return files.state;

  // shortcut: a refused save leaves the stored files unreferenced; TES-107 removes them.
  const created = await createBatchesFromNtp({
    tenantId: scope.tenantId,
    receiptDate: submission.receiptDate,
    ntpDate: submission.ntpDate,
    approvalDate: submission.approvalDate,
    ...files.value,
    rows,
  });
  if (created.status !== 'created') return createFailure(created);

  const codes = rows.map((r) => r.rqmCode);
  const logged = await appendActivity({
    tenantId: scope.tenantId,
    batchId: first.id,
    profileId: profile.id,
    action: 'created',
    entityType: 'batch',
    entityId: first.id,
    summary: `${codes.length === 1 ? 'Batch' : `${codes.length} batches`} created from a Notice to Proceed: ${codes.join(', ')}`,
    metadata: { source: 'ntp-pdf', rqm_codes: codes, ntp_received_date: submission.receiptDate, aou_recorded: files.value.aouPath !== null },
  });

  revalidatePath('/t/[tenantCode]', 'layout');
  return { status: 'saved', codes, logFailed: !logged.ok };
}
