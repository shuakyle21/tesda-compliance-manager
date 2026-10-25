import type { IconName } from '@/shared/ui/Icon';
import type { UrgencyTier } from '@/shared/types';

export type BillTone = { bg: string; fg: string; bd: string; icon: IconName };

/**
 * Colour and icon for the billing block in the batch record, by urgency tier.
 *
 * `muted` means no billing deadline is recorded. It gets the neutral tone, the
 * same one UrgencyIndicator uses for an unknown deadline: an unrecorded
 * deadline is missing data, not an overdue batch.
 *
 * The switch is exhaustive, so adding a tier to `UrgencyTier` fails to compile
 * here until that tier is given a tone.
 */
export function deriveBillTone(tier: UrgencyTier): BillTone {
  switch (tier) {
    case 'on-track':
      return { bg: 'var(--color-green-lt)', fg: 'var(--color-green-dk)', bd: 'var(--color-green)', icon: 'check' };
    case 'warning':
      return { bg: 'var(--color-amber-lt)', fg: 'var(--color-amber-dk)', bd: 'var(--color-amber-border)', icon: 'clock' };
    case 'critical':
    case 'overdue':
      return { bg: 'var(--color-red-lt)', fg: 'var(--color-red-dk)', bd: 'var(--color-red-border)', icon: 'alert-triangle' };
    case 'muted':
      return { bg: 'var(--color-surface-alt)', fg: 'var(--color-text-muted)', bd: 'var(--color-border)', icon: 'info-circle' };
    default: {
      const unhandled: never = tier;
      throw new Error(`No billing tone for urgency tier: ${String(unhandled)}`);
    }
  }
}
