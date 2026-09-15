'use server';

/**
 * Server Action — register a school and its CTPR/COPR programs (FR-02, ADR-006).
 *
 * Follows the shape set by `app/(dashboard)/users/new/actions.ts`, the repo's
 * first write path: validate through a module's `domain/`, write through a
 * module's `data/`, and return a discriminated state rather than throwing. A
 * thrown error in a Server Action reaches the browser as an opaque digest,
 * which would strand the operator with no idea whether anything was written.
 *
 * Unlike the create-user action this one composes only `modules/tenancy`, so
 * it could have lived inside that module. It stays here because a Server
 * Action is a route-level entry point and `users/new` established the
 * convention — one place to look for "what can this app write".
 *
 * SECURITY. The platform-admin check below is defence in depth and usability,
 * not the boundary. The boundary is Postgres RLS (migration 20260906114735):
 * a caller who is not in `platform_admins` and reached this action anyway
 * would have their INSERT rejected by policy and would get `denied`. Unlike
 * the create-user action there is no un-RLS'd branch here — nothing touches
 * Clerk — so RLS covers the whole path.
 */

import { getAuthUserId } from '@/modules/auth/data/auth';
import { getPlatformAdminSnapshot } from '@/modules/tenancy/data/platform';
import { createSchool, listQualifications } from '@/modules/tenancy/data/schools';
import {
  validateSchoolDraft,
  type CreateSchoolFormState,
  type SchoolProgramDraft,
} from '@/modules/tenancy/domain/schoolDraft';

/**
 * Rebuilds the program rows from the flat form payload.
 *
 * Every row renders inputs under the same four names, so the browser submits
 * four parallel lists in DOM order and index `i` of each belongs to row `i`.
 * `qualificationId` is the anchor because it is the only one of the four that
 * is always present as an element (a `select` always submits, even empty),
 * so its length is the true row count; the others are read positionally and
 * default to empty if anything is ever missing.
 */
function readProgramDrafts(formData: FormData): SchoolProgramDraft[] {
  const qualificationIds = formData.getAll('qualificationId');
  const coprNumbers = formData.getAll('coprNumber');
  const registrationStatuses = formData.getAll('registrationStatus');
  const deliveryModes = formData.getAll('deliveryMode');

  return qualificationIds.map((qualificationId, index) => ({
    qualificationId,
    coprNumber: coprNumbers[index] ?? '',
    registrationStatus: registrationStatuses[index] ?? '',
    deliveryMode: deliveryModes[index] ?? '',
  }));
}

export async function createSchoolAction(
  _previous: CreateSchoolFormState,
  formData: FormData,
): Promise<CreateSchoolFormState> {
  const clerkUserId = await getAuthUserId();
  if (!clerkUserId) return { status: 'denied' };

  const platform = await getPlatformAdminSnapshot();
  if (platform.status === 'unconfigured') return { status: 'unconfigured' };
  if (platform.status === 'sync-failed') return { status: 'failed' };
  if (!platform.isPlatformAdmin) return { status: 'denied' };

  // Validating the submitted qualification ids against the list actually on
  // offer turns a foreign-key failure into "choose a qualification from the
  // list", which the operator can act on.
  const qualifications = await listQualifications();
  if (qualifications.status === 'unconfigured') return { status: 'unconfigured' };
  if (qualifications.status === 'sync-failed') {
    console.error('createSchoolAction: qualifications lookup failed', qualifications.error);
    return { status: 'failed' };
  }

  const allowedQualificationIds = qualifications.qualifications.map((q) => q.id);

  const validation = validateSchoolDraft(
    {
      code: formData.get('code'),
      name: formData.get('name'),
      region: formData.get('region'),
      schoolType: formData.get('schoolType'),
      tesdaProviderCode: formData.get('tesdaProviderCode'),
      province: formData.get('province'),
      cityMunicipality: formData.get('cityMunicipality'),
      streetAddress: formData.get('streetAddress'),
      providerType: formData.get('providerType'),
      providerClassification: formData.get('providerClassification'),
      programs: readProgramDrafts(formData),
    },
    allowedQualificationIds,
  );

  if (!validation.ok) return { status: 'invalid', errors: validation.errors };

  const { command } = validation;
  const result = await createSchool(command);

  switch (result.status) {
    case 'created':
      return {
        status: 'created',
        tenantId: result.tenantId,
        name: command.name,
        code: command.code,
        programCount: command.programs.length,
      };
    case 'duplicate-code':
      return { status: 'duplicate-code', code: command.code };
    case 'denied':
      return { status: 'denied' };
    case 'unconfigured':
      return { status: 'unconfigured' };
    case 'sync-failed':
      // The raw message stays in the server log — never on the screen.
      console.error('createSchoolAction: create failed', result.error);
      return { status: 'failed' };
  }
}
