'use client';

/**
 * UI COMPONENT — BatchCard (ported from components/BatchCard.jsx)
 *
 * The primary data display component. Encodes urgency, billing-readiness,
 * program/NC badges, trainer, training window, NTP lag, BSRS, the lifecycle
 * pipeline, and the auto-remark. Client Component for onClick (opens the
 * BatchModal); hover elevation is CSS (.batch-card).
 */

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { LifecyclePipeline } from './LifecyclePipeline';
import { BatchIdLabel } from '@/modules/batches/ui/BatchIdLabel';
import { TrainerAvatar } from '@/shared/ui/TrainerAvatar';
import { UrgencyIndicator, BillingReadyBadge } from '@/shared/ui/UrgencyIndicator';
import { urgencyTier } from '@/modules/batches/domain/urgency';
import { isBillingReady } from '@/modules/billing/domain/readiness';
import { sessionProgress, describeSessionProgress } from '@/modules/batches/domain/progress';
import { formatDate } from '@/shared/dates';
import type { Batch, UrgencyTier } from '@/shared/types';

export function BatchCard({ batch, onClick }: { batch: Batch; onClick?: () => void }) {
  const tier = urgencyTier(batch.daysToBilling);
  const billingReady = isBillingReady(batch);

  // Chrome, hover and press live in design-system.css (.batch-card).
  const className = 'batch-card' + (billingReady ? ' billing-ready' : '') + (onClick ? ' clickable' : '');

  return (
    <div
      onClick={onClick}
      className={className}
      // A clickable div is invisible to the keyboard: expose it as a button.
      {...(onClick && {
        role: 'button',
        tabIndex: 0,
        'aria-label': `Open batch ${batch.name}`,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        },
      })}
    >
      {billingReady && <div className="billing-ready-stripe" />}

      {/* Header */}
      <div style={{ padding: '14px 16px 10px' }}>
        <CardHeaderBadges batch={batch} billingReady={billingReady} />
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginTop: 8 }}>
          {batch.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {batch.qualification}
        </div>
      </div>

      {/* Body */}
      <div className="batch-card-body">
        <Col>
          <Field label="Trainer">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrainerAvatar name={batch.trainer} size="sm" />
              <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{batch.trainer}</span>
            </div>
          </Field>
          <Field label="Scholars" style={{ marginTop: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{batch.scholars}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 6 }}>enrolled{batch.trainingDays ? ` · ${batch.trainingDays}` : ''}</span>
          </Field>
          <Field label="TIP" style={{ marginTop: 10 }}>
            {/* From the lifecycle, not a hardcoded "done" badge over an empty date. */}
            {batch.lifecycle.find((s) => s.key === 'tip')?.status === 'done'
              ? <StatusBadge variant="completed" iconName="check">{batch.tipDate || 'Done'}</StatusBadge>
              : <StatusBadge variant="upcoming">Pending</StatusBadge>}
          </Field>
        </Col>

        <Col borderLeft>
          <Field label="Training window">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>
              {formatDate(batch.trainingStart) ?? 'Not set'} → {formatDate(batch.trainingEnd) ?? 'Not set'}
            </span>
          </Field>
          <Field label={describeSessionProgress(batch)} style={{ marginTop: 10 }}>
            <SessionBar batch={batch} />
          </Field>
        </Col>

        <BillingCol batch={batch} tier={tier} />
      </div>

      {/* Lifecycle pipeline */}
      <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--color-border-faint)', background: 'var(--color-surface-raised)' }}>
        <LifecyclePipeline steps={batch.lifecycle} />
      </div>

      {/* Auto remark */}
      <div style={{
        padding: '10px 16px', background: 'var(--color-surface-alt)',
        borderTop: '1px solid var(--color-border-faint)',
        fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="info-circle" size={13} style={{ color: 'var(--color-text-muted)', fontStyle: 'normal' }} />
        {batch.remark}
      </div>
    </div>
  );
}

function CardHeaderBadges({ batch, billingReady }: { batch: Batch; billingReady: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      <StatusBadge variant={batch.program === 'TWSP' ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
      <StatusBadge variant={batch.ncLevel === 'NC II' ? 'nc-ii' : 'nc-i'}>{batch.ncLevel}</StatusBadge>
      {billingReady
        ? <BillingReadyBadge pulse />
        : <UrgencyIndicator days={batch.daysToBilling} variant="badge" />}
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
        <BatchIdLabel batch={batch} />
      </span>
    </div>
  );
}

function BillingCol({ batch, tier }: { batch: Batch; tier: UrgencyTier }) {
  // ntpLag is null until NTP and start dates are mapped — never a green "Same-day".
  const ntpSameDay = batch.ntpLag === 0;
  return (
    <Col borderLeft>
      <Field label="NTP → Start lag">
        {/* Mono is for figures; the "Not recorded" / "Same-day" words read as sans. */}
        <span style={{ fontFamily: batch.ntpLag ? 'var(--font-mono)' : undefined, fontSize: 12, color: ntpSameDay ? 'var(--color-green-dk)' : 'var(--color-text-primary)' }}>
          {batch.ntpLag === null ? 'Not recorded' : ntpSameDay ? 'Same-day' : `${batch.ntpLag} days`}
        </span>
      </Field>
      <Field label="Billing deadline" style={{ marginTop: 10 }}>
        <span style={{
          fontFamily: batch.billingDeadline ? 'var(--font-mono)' : undefined, fontSize: 12, fontWeight: 500,
          color: tier === 'critical' || tier === 'overdue' ? 'var(--color-red-dk)'
            : tier === 'warning' ? 'var(--color-amber-dk)'
            : 'var(--color-text-primary)',
        }}>
          {formatDate(batch.billingDeadline) ?? 'Not recorded'}
        </span>
      </Field>
      <Field label="BSRS" style={{ marginTop: 10 }}>
        <StatusBadge variant={batch.bsrs ? 'approved' : 'not-approved'} iconName={batch.bsrs ? 'shield-check' : 'shield-off'}>
          {batch.bsrs ? 'VERIFIED' : 'NOT VERIFIED'}
        </StatusBadge>
      </Field>
    </Col>
  );
}

/** Session bar when attendance is recorded; otherwise the unavailable state in words. */
function SessionBar({ batch }: { batch: Batch }) {
  const progress = sessionProgress(batch);
  return progress
    ? <ProgressBar percent={progress.pct} />
    : <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Attendance not recorded yet</span>;
}

function Col({ children, borderLeft }: { children: ReactNode; borderLeft?: boolean }) {
  return (
    <div className={borderLeft ? 'batch-card-col divided' : 'batch-card-col'}>{children}</div>
  );
}

function Field({ label, children, style }: { label: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{children}</div>
    </div>
  );
}

export default BatchCard;
