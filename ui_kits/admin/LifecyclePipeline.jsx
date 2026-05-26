/* global React, Icon */
/* LifecyclePipeline — 6 fixed stages: AOU → NTP → TIP → Training → Assessment → Billing
   Props: steps (array of { key, label, status: 'done'|'active'|'pending'|'overdue', date })
*/

function LifecyclePipeline({ steps }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
      paddingTop: 6,
    }}>
      {steps.map((s, i) => (
        <Step key={s.key} step={s} index={i} isLast={i === steps.length - 1} />
      ))}
    </div>
  );
}

function Step({ step, index, isLast }) {
  const isDone = step.status === 'done';
  const isActive = step.status === 'active';
  const isOverdue = step.status === 'overdue';

  let circleStyle = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border-strong)',
    color: 'var(--color-text-muted)',
  };
  if (isDone)    circleStyle = { background: 'var(--color-green)', borderColor: 'var(--color-green)', color: 'white' };
  if (isActive)  circleStyle = { background: 'var(--color-blue)',  borderColor: 'var(--color-blue)',  color: 'white' };
  if (isOverdue) circleStyle = { background: 'var(--color-red)',   borderColor: 'var(--color-red)',   color: 'white' };

  const lineColor = isDone ? 'var(--color-green)' : 'var(--color-border)';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
      {!isLast && (
        <div style={{
          position: 'absolute', top: 17, left: '50%', right: '-50%',
          height: 1, background: lineColor, zIndex: 1,
        }} />
      )}
      <div style={{
        width: 22, height: 22, borderRadius: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        border: '1px solid', zIndex: 2,
        ...circleStyle,
        animation: isActive ? 'pipeline-pulse 2s ease-in-out infinite' : 'none',
      }}>
        {isDone && <Icon name="check" size={12} />}
        {isActive && <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19" /></svg>}
        {isOverdue && <Icon name="alert-triangle" size={11} />}
        {!isDone && !isActive && !isOverdue && (index + 1)}
      </div>
      <div style={{
        marginTop: 8, fontSize: 10, fontWeight: 500, textAlign: 'center',
        color: (step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text-primary)'),
        letterSpacing: '0.02em',
      }}>
        {step.label}
      </div>
      <div style={{
        marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--color-text-muted)', fontWeight: 500, textAlign: 'center',
      }}>
        {step.date || (step.status === 'pending' ? 'Pending' : '')}
      </div>
    </div>
  );
}

window.LifecyclePipeline = LifecyclePipeline;
