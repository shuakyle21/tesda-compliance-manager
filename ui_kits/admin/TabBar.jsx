/* global React, Icon */
/* TabBar — underline style only, never pills. */

function TabBar({ tabs, value, onChange }) {
  return (
    <nav style={{
      display: 'flex',
      borderBottom: '1px solid var(--color-border)',
    }} aria-label="Dashboard navigation">
      {tabs.map(t => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange && onChange(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--color-blue)' : 'var(--color-text-muted)',
              borderBottom: `2px solid ${active ? 'var(--color-blue)' : 'transparent'}`,
              marginBottom: -1,
              background: 'none', border: 'none',
              borderBottomWidth: 2, borderBottomStyle: 'solid',
              cursor: 'pointer',
              transition: 'color 150ms var(--ease-standard)',
            }}
          >
            {t.icon && <Icon name={t.icon} size={14} />}
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

window.TabBar = TabBar;
