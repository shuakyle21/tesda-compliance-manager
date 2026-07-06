/**
 * UI COMPONENT — UrgencyIndicator + BillingReadyBadge
 * (ported from components/UrgencyIndicator.jsx)
 *
 * Days-to-billing rendered with a semantic tier color + icon. BillingReadyBadge
 * is the green "READY FOR BILLING" chip shown once training crosses 80%.
 */

import { Icon, type IconName } from './Icon';

type Tier = 'critical' | 'warning' | 'on-track' | 'overdue' | 'unknown';

function tierOf(days: number | null | undefined): Tier {
  if (days == null) return 'unknown';
  if (days < 0) return 'overdue';
  if (days <= 6) return 'critical';
  if (days <= 21) return 'warning';
  return 'on-track';
}

const TIER_STYLES: Record<Tier, { fg: string; bg: string; icon: IconName }> = {
  critical:   { fg: 'var(--color-red-dk)',    bg: 'var(--color-red-lt)',     icon: 'alert-triangle' },
  warning:    { fg: 'var(--color-amber-dk)',  bg: 'var(--color-amber-lt)',   icon: 'clock' },
  'on-track': { fg: 'var(--color-green-dk)',  bg: 'var(--color-green-lt)',   icon: 'check' },
  overdue:    { fg: 'var(--color-red-dk)',    bg: 'var(--color-red-lt)',     icon: 'alert-circle' },
  unknown:    { fg: 'var(--color-text-muted)', bg: 'var(--color-surface-alt)', icon: 'clock' },
};

export function BillingReadyBadge({ variant = 'badge', pulse = false }: { variant?: 'inline' | 'badge'; pulse?: boolean }) {
  if (variant === 'inline') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        color: 'var(--color-green-dk)',
      }}>
        {pulse && <span style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: 9999,
          background: 'var(--color-green)', marginRight: 2,
          animation: 'billingReadyPulse 1.8s ease-in-out infinite',
        }} />}
        <Icon name="receipt" size={13} />
        READY FOR BILLING
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 20, padding: '0 8px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-green-lt)', color: 'var(--color-green-dk)',
      border: '1px solid var(--color-green)',
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
      position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {pulse && <span style={{
        position: 'absolute', inset: 0,
        background: 'var(--color-green-lt)',
        animation: 'billingReadyGlow 2s ease-in-out infinite',
        borderRadius: 'inherit',
      }} />}
      <Icon name="receipt" size={12} />
      <span style={{ position: 'relative' }}>READY FOR BILLING</span>
    </span>
  );
}

export function UrgencyIndicator({ days, variant = 'inline' }: { days: number; variant?: 'inline' | 'badge' }) {
  const s = TIER_STYLES[tierOf(days)];

  let label: string;
  if (days < 0) label = `${Math.abs(days)}D OVERDUE`;
  else if (days === 0) label = 'TODAY';
  else label = `${days} DAYS`;

  if (variant === 'badge') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 20, padding: '0 8px',
        borderRadius: 'var(--radius-md)',
        background: s.bg, color: s.fg,
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
      }}>
        <Icon name={s.icon} size={12} />
        {label}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: s.fg, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
      <Icon name={s.icon} size={14} />
      {label}
    </span>
  );
}

export default UrgencyIndicator;
