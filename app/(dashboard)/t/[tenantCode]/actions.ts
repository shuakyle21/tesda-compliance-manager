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

import { revalidatePath } from 'next/cache';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { appendActivity } from '@/modules/activity/data/activity';
import { getBatchesSnapshot, setBatchRqmCode, type SetRqmResult } from '@/modules/batches/data/batches';
import { checkRqmCode, type RqmFormState } from '@/modules/batches/domain/rqm';
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
  if (resolved.status !== 'ok') return DENIED;
  const { scope, profile } = resolved;

  const role = await resolveTrustedRole(profile.role);
  if (role !== 'admin' && role !== 'coordinator') return DENIED;

  const input = await validateInput(text(formData, 'rqmCode'), batchCode, expectedPrevious, scope, profile);
  if (!input.ok) return input.state;

  const result = await setBatchRqmCode({ tenantId: scope.tenantId, batchCode, expectedPrevious, next: input.next });
  const failure = failureState(result);
  if (failure || result.status !== 'saved') return failure ?? SAVE_FAILED;

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
