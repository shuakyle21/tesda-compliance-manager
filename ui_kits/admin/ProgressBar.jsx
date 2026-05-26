/* global React */
/* ProgressBar — color shifts at 25 / 75 / 100%.
   Props: percent (0..100), label, variant ('default' | 'mini' | 'card')
*/

function progressColor(pct) {
  if (pct >= 100) return 'var(--color-green)';
  if (pct >= 75)  return 'var(--color-green)';
  if (pct >= 25)  return 'var(--color-blue)';
  return 'var(--color-amber)';
}

function ProgressBar({ percent, label, variant = 'default' }) {
  const safePct = Math.max(0, Math.min(100, percent));
  const fillColor = progressColor(safePct);
  const isComplete = safePct >= 100;
  const isMini = variant === 'mini';
  const height = isMini ? 4 : 6;

  const track = (
    <div
      style={{
        height, borderRadius: 9999, overflow: 'hidden',
        background: isComplete ? 'var(--color-green-lt)' : 'var(--color-surface-alt)',
        flex: 1, minWidth: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(safePct, safePct === 0 ? 0 : 2)}%`,
          background: fillColor,
          borderRadius: 9999,
          animation: 'progress-fill 400ms var(--ease-spring) 100ms backwards',
        }}
      />
    </div>
  );

  if (isMini) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        {track}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--color-text-secondary)', minWidth: 32, textAlign: 'right',
        }}>
          {safePct}%
        </span>
      </div>
    );
  }

  return (
    <div>
      {label !== undefined && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 4,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{safePct}%</span>
        </div>
      )}
      <div style={{ display: 'flex' }}>{track}</div>
    </div>
  );
}

window.ProgressBar = ProgressBar;
