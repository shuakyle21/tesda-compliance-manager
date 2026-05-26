/* global React, Icon */
/* InfoCallout — modern SaaS treatment (no left accent).
   Props: variant ('info'|'success'|'warning'|'error'), children, dismissable, onDismiss
*/

const CALLOUT_STYLES = {
  info:    { bg: 'var(--color-blue-lt)',  fg: 'var(--color-blue-dk)',  bd: 'var(--color-blue-border)',  icon: 'info-circle' },
  success: { bg: 'var(--color-green-lt)', fg: 'var(--color-green-dk)', bd: 'var(--color-green-border)', icon: 'check' },
  warning: { bg: 'var(--color-amber-lt)', fg: 'var(--color-amber-dk)', bd: 'var(--color-amber-border)', icon: 'alert-triangle' },
  error:   { bg: 'var(--color-red-lt)',   fg: 'var(--color-red-dk)',   bd: 'var(--color-red-border)',   icon: 'alert-circle' },
};

function InfoCallout({ variant = 'info', children, dismissable = false, onDismiss }) {
  const s = CALLOUT_STYLES[variant];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '11px 14px',
      border: `1px solid ${s.bd}`,
      borderRadius: 'var(--radius-lg)',
      background: s.bg, color: s.fg,
      fontSize: 13, lineHeight: '19px',
    }}>
      <Icon name={s.icon} size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>{children}</div>
      {dismissable && (
        <button onClick={onDismiss} aria-label="Dismiss" style={{
          color: 'currentColor', opacity: 0.55, cursor: 'pointer',
          padding: 0, background: 'none', border: 'none', flexShrink: 0, marginTop: 1,
        }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

window.InfoCallout = InfoCallout;
