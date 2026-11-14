/**
 * Displayed batch identity. The RQM code (from the Notice to Proceed) is the
 * batch's official ID; until it is recorded we fall back to the internal batch
 * code. Display only — keys, URLs and lookups keep using `Batch.id`.
 */

import type { Batch } from '@/shared/types';

export function displayBatchId(b: Pick<Batch, 'id' | 'rqmCode'>): string {
  return b.rqmCode ?? b.id;
}
