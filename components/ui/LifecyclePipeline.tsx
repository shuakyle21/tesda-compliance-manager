/**
 * UI COMPONENT — LifecyclePipeline (ported from components/LifecyclePipeline.jsx)
 *
 * Fixed-stage process: AOU → NTP → TIP → Training → ENTRE → Assessment → Billing.
 * The ENTRE (Entrepreneurship) stage gets a distinct purple treatment + briefcase
 * glyph so it reads as its own phase between training and assessment.
 */

import { Icon } from './Icon';
import type { LifecycleStage } from '@/lib/data/types';

export function LifecyclePipeline({ steps }: { steps: LifecycleStage[] }) {
  const dense = steps.length >= 7;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, paddingTop: 6 }}>
      {steps.map((s, i) => (
        <Step key={s.key} step={s} index={i} isLast={i === steps.length - 1} dense={dense} />
      ))}
    </div>
  );
}

function Step({ step, index, isLast, dense }: { step: LifecycleStage; index: number; isLast: boolean; dense: boolean }) {
  const isDone = step.status === 'done';
  const isActive = step.status === 'active';
  const isOverdue = (step.status as string) === 'overdue';
  const isEntre = step.key === 'entre';
  const entrePending = isEntre && !isDone && !isActive && !isOverdue;

  let circleStyle: { background: string; borderColor: string; color: string } = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border-strong)',
    color: 'var(--color-text-muted)',
  };
  if (entrePending) circleStyle = { background: 'var(--color-purple-lt)', borderColor: 'var(--color-purple)', color: 'var(--color-purple-dk)' };
  if (isDone) circleStyle = { background: 'var(--color-green)', borderColor: 'var(--color-green)', color: 'white' };
  if (isActive) circleStyle = isEntre
    ? { background: 'var(--color-purple)', borderColor: 'var(--color-purple)', color: 'white' }
    : { background: 'var(--color-blue)', borderColor: 'var(--color-blue)', color: 'white' };
  if (isOverdue) circleStyle = { background: 'var(--color-red)', borderColor: 'var(--color-red)', color: 'white' };

  const lineColor = isDone ? 'var(--color-green)' : 'var(--color-border)';
  const labelSize = dense ? 9 : 10;
  const dateSize = dense ? 9 : 10;

  const entreTint = isEntre && !isDone;
  const labelColor = entreTint ? 'var(--color-purple)'
    : (step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text-primary)');
  const dateColor = entreTint ? 'var(--color-purple-dk)' : 'var(--color-text-muted)';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
      {!isLast && (
        <div style={{ position: 'absolute', top: 17, left: '50%', right: '-50%', height: 1, background: lineColor, zIndex: 1 }} />
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
        {isActive && !isEntre && <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19" /></svg>}
        {isActive && isEntre && <Icon name="briefcase" size={11} />}
        {isOverdue && <Icon name="alert-triangle" size={11} />}
        {entrePending && <Icon name="briefcase" size={11} />}
        {!isDone && !isActive && !isOverdue && !isEntre && (index + 1)}
      </div>
      <div style={{ marginTop: 8, fontSize: labelSize, fontWeight: isEntre ? 600 : 500, textAlign: 'center', color: labelColor, letterSpacing: '0.02em', lineHeight: 1.2 }}>
        {step.label}
      </div>
      <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: dateSize, color: dateColor, fontWeight: 500, textAlign: 'center' }}>
        {step.date || (step.status === 'pending' ? 'Pending' : '')}
      </div>
    </div>
  );
}

export default LifecyclePipeline;
