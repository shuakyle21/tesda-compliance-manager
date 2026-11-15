/**
 * Scholar count against the batch's required count. Pure — no I/O.
 *
 * The approved slots on the Notice to Proceed are the number of scholars the
 * batch must enrol (TES-102). `approvedSeats` is unset until the NTP's slots
 * are recorded, so the count then shows enrolled scholars alone.
 */

import type { Batch } from '@/shared/types';

/** "12/25" when the required count is known, otherwise "12". */
export function scholarCountLabel(b: Pick<Batch, 'scholars' | 'approvedSeats'>): string {
  return b.approvedSeats ? `${b.scholars}/${b.approvedSeats}` : `${b.scholars}`;
}
