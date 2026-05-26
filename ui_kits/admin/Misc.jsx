/* global React, Icon */
/* DocumentLinkRow, EmptyState, Toast — small utility components. */

function DocumentLinkRow({ label, href, missing }) {
  if (missing) {
    return (
      <div style={rowBase()}>
        <Icon name="file-off" size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{label}</span>
      </div>
    );
  }
  return (
    <a href={href || '#'} target="_blank" rel="noopener noreferrer" style={rowBase('a')}>
      <Icon name="file-text" size={14} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <Icon name="external-link" size={12} style={{ color: 'var(--color-text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
    </a>
  );
}

function rowBase(tag) {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 0',
    borderBottom: '0.5px solid var(--color-border-faint)',
    fontSize: 13,
    textDecoration: 'none',
  };
}

function EmptyState({ iconName = 'search-off', heading, sub, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px', gap: 8, textAlign: 'center',
    }}>
      <Icon name={iconName} size={32} style={{ color: 'var(--color-text-muted)' }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 6 }}>{heading}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320 }}>{sub}</div>}
      {action}
    </div>
  );
}

function Toast({ title, message, onDismiss }) {
  return (
    <div className="toast" role="status">
      <Icon name="check" size={16} />
      <div style={{ flex: 1 }}>
        <div className="ttl">{title}</div>
        {message && <div className="msg">{message}</div>}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

window.DocumentLinkRow = DocumentLinkRow;
window.EmptyState = EmptyState;
window.Toast = Toast;
