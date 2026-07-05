/**
 * UI COMPONENT — ProgressBar (ported from components/ProgressBar.jsx)
 *
 * Fill color shifts by tier (amber < 25 < blue < 75 < green) and animates in.
 * `mini` variant renders an inline track + right-aligned mono percent.
 */

function progressColor(pct: number) {
  if (pct >= 100) return 'var(--color-green)';
  if (pct >= 75) return 'var(--color-green)';
  if (pct >= 25) return 'var(--color-blue)';
  return 'var(--color-amber)';
}

interface ProgressBarProps {
  percent: number;
  label?: string;
  variant?: 'default' | 'mini' | 'card';
}

export function ProgressBar({ percent, label, variant = 'default' }: ProgressBarProps) {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{safePct}%</span>
        </div>
      )}
      <div style={{ display: 'flex' }}>{track}</div>
    </div>
  );
}

export default ProgressBar;
