/**
 * UI COMPONENT — LifecyclePipeline (ported from components/LifecyclePipeline.jsx)
 *
 * Fixed-stage process: AOU → NTP → TIP → Training → ENTRE → Assessment → Billing.
 * The ENTRE (Entrepreneurship) stage gets a distinct purple treatment + briefcase
 * glyph so it reads as its own phase between training and assessment.
 */

import { Icon } from '@/shared/ui/Icon';
import type { LifecycleStage } from '@/shared/types';

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

interface StepFlags {
  isDone: boolean;
  isActive: boolean;
  isOverdue: boolean;
  isEntre: boolean;
  entrePending: boolean;
}

function deriveStepFlags(step: LifecycleStage): StepFlags {
  const isDone = step.status === 'done';
  const isActive = step.status === 'active';
  const isOverdue = (step.status as string) === 'overdue';
  const isEntre = step.key === 'entre';
  const entrePending = isEntre && !isDone && !isActive && !isOverdue;
  return { isDone, isActive, isOverdue, isEntre, entrePending };
}

function deriveCircleStyle({ isDone, isActive, isOverdue, isEntre, entrePending }: StepFlags) {
  if (isOverdue) return { background: 'var(--color-red)', borderColor: 'var(--color-red)', color: 'white' };
  if (isActive) {
    return isEntre
      ? { background: 'var(--color-purple)', borderColor: 'var(--color-purple)', color: 'white' }
      : { background: 'var(--color-blue)', borderColor: 'var(--color-blue)', color: 'white' };
  }
  if (isDone) return { background: 'var(--color-green)', borderColor: 'var(--color-green)', color: 'white' };
  if (entrePending) return { background: 'var(--color-purple-lt)', borderColor: 'var(--color-purple)', color: 'var(--color-purple-dk)' };
  return { background: 'var(--color-surface)', borderColor: 'var(--color-border-strong)', color: 'var(--color-text-muted)' };
}

function StepIcon({ flags, index }: { flags: StepFlags; index: number }) {
  const { isDone, isActive, isOverdue, isEntre, entrePending } = flags;
  if (isDone) return <Icon name="check" size={12} />;
  if (isActive && !isEntre) return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19" /></svg>;
  if (isActive && isEntre) return <Icon name="briefcase" size={11} />;
  if (isOverdue) return <Icon name="alert-triangle" size={11} />;
  if (entrePending) return <Icon name="briefcase" size={11} />;
  return <>{index + 1}</>;
}

function Step({ step, index, isLast, dense }: { step: LifecycleStage; index: number; isLast: boolean; dense: boolean }) {
  const flags = deriveStepFlags(step);
  const { isDone, isActive, isEntre } = flags;
  const circleStyle = deriveCircleStyle(flags);

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
        <StepIcon flags={flags} index={index} />
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
