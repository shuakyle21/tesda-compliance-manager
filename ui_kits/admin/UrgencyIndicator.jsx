/* global React, Icon */
/* UrgencyIndicator — days remaining + icon, semantic-colored.
   Props: days (number), variant ('inline' | 'badge')
*/

function urgencyTier(days) {
  if (days == null) return 'unknown';
  if (days < 0) return 'overdue';
  if (days <= 6) return 'critical';
  if (days <= 21) return 'warning';
  return 'on-track';
}

const TIER_STYLES = {
  critical: { fg: 'var(--color-red-dk)',   bg: 'var(--color-red-lt)',   icon: 'alert-triangle' },
  warning:  { fg: 'var(--color-amber-dk)', bg: 'var(--color-amber-lt)', icon: 'clock' },
  'on-track': { fg: 'var(--color-green-dk)', bg: 'var(--color-green-lt)', icon: 'check' },
  overdue:  { fg: 'var(--color-red-dk)',   bg: 'var(--color-red-lt)',   icon: 'alert-circle' },
  unknown:  { fg: 'var(--color-text-muted)', bg: 'var(--color-surface-alt)', icon: 'clock' },
};

function UrgencyIndicator({ days, variant = 'inline' }) {
  const tier = urgencyTier(days);
  const s = TIER_STYLES[tier];

  let label;
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
        fontFamily: 'var(--font-mono)',
        fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
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

window.UrgencyIndicator = UrgencyIndicator;
window.urgencyTier = urgencyTier;
