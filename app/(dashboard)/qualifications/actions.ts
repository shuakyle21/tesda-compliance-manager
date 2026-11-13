'use server';

/**
 * Server Action — set or remove a qualification's header image.
 *
 * Same shape as `../schools/new/actions.ts`: platform-admin check for a clear
 * answer, then a module `data/` write that RLS (migration 20261113120000)
 * authorizes. The check is usability; the bucket and table policies are the
 * boundary.
 */

import { revalidatePath } from 'next/cache';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { getPlatformAdminSnapshot } from '@/modules/tenancy/data/platform';
import {
  removeQualificationImage,
  replaceQualificationImage,
  type QualificationImageWriteResult,
} from '@/modules/tenancy/data/qualificationImages';
import type { QualificationImageFormState } from '@/modules/tenancy/domain/qualificationImage';

function toState(
  result: QualificationImageWriteResult,
  qualificationId: string,
  success: QualificationImageFormState,
): QualificationImageFormState {
  switch (result.status) {
    case 'ok':
      return success;
    case 'rejected':
      return { status: 'rejected', qualificationId, reason: result.reason };
    case 'denied':
      return { status: 'denied' };
    case 'unconfigured':
      return { status: 'unconfigured' };
    case 'sync-failed':
      // Raw message stays in the server log, never on screen.
      console.error('qualificationImageAction failed', result.error);
      return { status: 'failed', qualificationId };
  }
}

export async function qualificationImageAction(
  _previous: QualificationImageFormState,
  formData: FormData,
): Promise<QualificationImageFormState> {
  if (!(await getAuthUserId())) return { status: 'denied' };
  const platform = await getPlatformAdminSnapshot();
  if (platform.status === 'unconfigured') return { status: 'unconfigured' };
  if (platform.status === 'sync-failed') return { status: 'failed' };
  if (!platform.isPlatformAdmin) return { status: 'denied' };

  const qualificationId = String(formData.get('qualificationId') ?? '');
  if (!qualificationId) return { status: 'failed' };

  if (formData.get('intent') === 'remove') {
    const result = await removeQualificationImage(qualificationId);
    if (result.status === 'ok') revalidatePath('/', 'layout');
    return toState(result, qualificationId, { status: 'removed', qualificationId });
  }

  const file = formData.get('image');
  if (!(file instanceof File)) return { status: 'rejected', qualificationId, reason: 'missing' };
  const result = await replaceQualificationImage({ qualificationId, file });
  if (result.status === 'ok') revalidatePath('/', 'layout');
  return toState(result, qualificationId, { status: 'saved', qualificationId });
}
