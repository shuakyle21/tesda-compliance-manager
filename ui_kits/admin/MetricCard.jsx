/* global React, Icon */
/* MetricCard — single key number at the top of the dashboard.
   Spec §8.3. Warning/critical variants use icon-tinted label, not a left border.
   Props: label, value, sub, variant ('neutral'|'warning'|'critical'), iconName
*/

function MetricCard({ label, value, sub, variant = 'neutral', iconName }) {
  const variantStyles = {
    neutral:  {},
    warning:  { labelColor: 'var(--color-amber)', subColor: 'var(--color-amber-dk)', subWeight: 500, iconHint: 'alert-triangle' },
    critical: { labelColor: 'var(--color-red)',   subColor: 'var(--color-red-dk)',   subWeight: 500, iconHint: 'alert-circle' },
  };
  const v = variantStyles[variant] || variantStyles.neutral;
  const labelIcon = iconName || v.iconHint;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 80,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-mono)',
        fontSize: 11, fontWeight: 500,
        color: v.labelColor || 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {labelIcon && <Icon name={labelIcon} size={13} />}
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600,
        color: 'var(--color-text-primary)', marginTop: 6, lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 11, marginTop: 6,
          color: v.subColor || 'var(--color-text-muted)',
          fontWeight: v.subWeight || 400,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

window.MetricCard = MetricCard;
