'use client';

/**
 * OVERLAY — BatchModal (ported from components/BatchModal.jsx)
 *
 * Notion-style database-record view for a single batch. Opens on card/row click.
 * Esc closes, background scroll locks while open, and a closing animation plays
 * before unmount. Built entirely from the existing kit + tokens.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { LifecyclePipeline } from './LifecyclePipeline';
import { TrainerAvatar } from '@/shared/ui/TrainerAvatar';
import { UrgencyIndicator, BillingReadyBadge } from '@/shared/ui/UrgencyIndicator';
import { TrainingDayPills } from '@/shared/ui/TrainingDayPills';
import { urgencyTier } from '@/modules/batches/domain/urgency';
import { isBillingReady } from '@/modules/billing/domain/readiness';
import { sessionProgress, describeSessionProgress } from '@/modules/batches/domain/progress';
import { formatDate } from '@/shared/dates';
import type { Batch, LifecycleStage, UrgencyTier } from '@/shared/types';

type BatchPropRow = { label: string; icon: IconName; value: ReactNode };
type BillTone = { bg: string; fg: string; bd: string; icon: IconName };

function deriveBillTone(tier: UrgencyTier): BillTone {
  if (tier === 'on-track') return { bg: 'var(--color-green-lt)', fg: 'var(--color-green-dk)', bd: 'var(--color-green)', icon: 'check' };
  if (tier === 'warning') return { bg: 'var(--color-amber-lt)', fg: 'var(--color-amber-dk)', bd: 'var(--color-amber-border)', icon: 'clock' };
  return { bg: 'var(--color-red-lt)', fg: 'var(--color-red-dk)', bd: 'var(--color-red-border)', icon: 'alert-triangle' };
}

function buildBatchProps(batch: Batch, isTwsp: boolean, billingReady: boolean): BatchPropRow[] {
  return [
    { label: 'Trainer', icon: 'user', value: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrainerAvatar name={batch.trainer} size="sm" />
        <span style={{ fontSize: 13 }}>{batch.trainer}</span>
      </div>
    ) },
    { label: 'Training Days', icon: 'calendar', value: <TrainingDayPills schedule={batch.trainingDaySchedule} program={batch.program} /> },
    { label: 'Program', icon: 'folders', value: <StatusBadge variant={isTwsp ? 'twsp' : 'cfsp'}>{batch.program} · {batch.ncLevel}</StatusBadge> },
    { label: 'Status', icon: 'info-circle', value: billingReady ? <BillingReadyBadge /> : <BatchStatusBadge batch={batch} /> },
    { label: 'BSRS', icon: 'shield-check', value: (
      <StatusBadge variant={batch.bsrs ? 'approved' : 'not-approved'} iconName={batch.bsrs ? 'shield-check' : 'shield-off'}>
        {batch.bsrs ? 'VERIFIED' : 'NOT VERIFIED'}
      </StatusBadge>
    ) },
    { label: 'NTP → Start', icon: 'calendar', value: (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: batch.ntpLag === 0 ? 'var(--color-green-dk)' : 'var(--color-text-primary)' }}>
        {batch.ntpLag === null ? 'Not recorded' : batch.ntpLag === 0 ? 'Same-day' : `${batch.ntpLag} days`}
      </span>
    ) },
    { label: 'TIP', icon: 'check', value: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{batch.tipDate || 'Not recorded'}</span> },
    { label: 'AOU', icon: 'file-invoice', value: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{batch.aouDate || 'Not recorded'}</span> },
    { label: 'Report dates', icon: 'file-text', value: (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>NTP {batch.ntpDate || 'not recorded'} · Report {batch.reportDate || 'not recorded'}</span>
    ) },
  ];
}

function BatchModalHero({ batch, isTwsp, billingReady }: { batch: Batch; isTwsp: boolean; billingReady: boolean }) {
  return (
    <div className="nm-hero" style={{
      background: isTwsp
        ? 'linear-gradient(135deg, var(--color-blue-lt) 0%, var(--color-surface) 62%)'
        : 'linear-gradient(135deg, var(--color-teal-lt) 0%, var(--color-surface) 62%)',
    }}>
      <div className="nm-hero-badges">
        <StatusBadge variant={isTwsp ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
        <StatusBadge variant={batch.ncLevel === 'NC II' ? 'nc-ii' : 'nc-i'}>{batch.ncLevel}</StatusBadge>
        {billingReady ? <BillingReadyBadge pulse /> : <UrgencyIndicator days={batch.daysToBilling} variant="badge" />}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{batch.id}</span>
      </div>
      <div className="nm-title">{batch.name}</div>
      <div className="nm-subtitle">{batch.qualification}</div>
    </div>
  );
}

function BatchEntreSection({ entre }: { entre: LifecycleStage }) {
  return (
    <div className="nm-section">
      <div className="nm-section-title" style={{ color: 'var(--color-entre)' }}>
        <Icon name="briefcase" size={13} style={{ color: 'var(--color-entre)' }} />Entrepreneurship
      </div>
      <div className="nm-entre-grid">
        <div className="nm-entre-card" style={{ background: 'var(--color-entre-lt)', borderColor: 'var(--color-entre)' }}>
          <div className="nm-entre-cap" style={{ color: 'var(--color-entre)' }}>Schedule</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-entre-dk)' }}>{entre.date || 'TBD'}</div>
          <div style={{ fontSize: 11, color: 'var(--color-entre)', marginTop: 3, opacity: 0.85 }}>Immediately after training</div>
        </div>
        <div className="nm-entre-card">
          <div className="nm-entre-cap">Duration</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, lineHeight: 1, color: 'var(--color-text-primary)' }}>3</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>training days</div>
        </div>
        <div className="nm-entre-card">
          <div className="nm-entre-cap">Status</div>
          {entre.status === 'done' && <StatusBadge variant="completed" iconName="check">COMPLETED</StatusBadge>}
          {entre.status === 'active' && <StatusBadge variant="ongoing">IN PROGRESS</StatusBadge>}
          {entre.status !== 'done' && entre.status !== 'active' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
              borderRadius: 'var(--radius-md)', background: 'var(--color-entre-lt)', color: 'var(--color-entre-dk)',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
            }}>PENDING</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BatchScholarsGrid({ batch }: { batch: Batch }) {
  const dropoutColor = (batch.dropouts ?? 0) > 0 ? 'var(--color-red-dk)' : 'var(--color-text-muted)';
  const stats = [
    { label: 'Approved seats', value: batch.approvedSeats, color: 'var(--color-text-primary)' },
    { label: 'Enrolled', value: batch.scholars, color: 'var(--color-blue-dk)' },
    { label: 'Completers', value: batch.completers, color: 'var(--color-green-dk)' },
    { label: 'Dropouts', value: batch.dropouts, color: dropoutColor },
  ];
  return (
    <div className="nm-section">
      <div className="nm-section-title"><Icon name="users" size={13} />Scholars</div>
      <div className="nm-scholars-grid">
        {stats.map((s) => (
          <div key={s.label} className="nm-scholar-card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, lineHeight: 1, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The batch's recorded status in words — not "Training Ongoing" for every batch. */
function BatchStatusBadge({ batch }: { batch: Batch }) {
  if (batch.blocked) return <StatusBadge variant="cancelled" iconName="alert-triangle">Blocked</StatusBadge>;
  if (batch.status === 'completed') return <StatusBadge variant="completed" iconName="check">Completed</StatusBadge>;
  if (batch.status === 'pending') return <StatusBadge variant="upcoming">Not started</StatusBadge>;
  return <StatusBadge variant="ongoing" iconName="check">Training ongoing</StatusBadge>;
}

export function BatchModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 170);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [close]);

  const isTwsp = batch.program === 'TWSP';
  const tier = urgencyTier(batch.daysToBilling);
  const billingReady = isBillingReady(batch);
  const billTone = deriveBillTone(tier);
  const entre = (batch.lifecycle || []).find((s) => s.key === 'entre');
  const sessions = sessionProgress(batch);
  const props = buildBatchProps(batch, isTwsp, billingReady);

  return (
    <div className={`nm-backdrop${closing ? ' closing' : ''}`} onClick={close}>
      <div className="nm-overlay">
        <div className={`nm-sheet${closing ? ' closing' : ''}`} onClick={(e) => e.stopPropagation()}>

          <div className="nm-topbar">
            <div className="nm-breadcrumb">
              <span className="crumb" onClick={close}>Training Batch Manager</span>
              <Icon name="chevron-right" size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
              <span className="current">{batch.id} · {batch.name}</span>
            </div>
            <button className="nm-close" onClick={close} aria-label="Close"><Icon name="x" size={16} /></button>
          </div>

          <BatchModalHero batch={batch} isTwsp={isTwsp} billingReady={billingReady} />

          <div className="nm-props">
            {props.map((row) => (
              <div key={row.label} className="nm-prop">
                <div className="nm-prop-label">
                  <Icon name={row.icon} size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  {row.label}
                </div>
                <div className="nm-prop-value">{row.value}</div>
              </div>
            ))}
          </div>

          <div className="nm-section">
            <div className="nm-section-title"><Icon name="chart-dots" size={13} />Training Progress</div>
            <div className="nm-progress-grid">
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 600, lineHeight: 1, color: 'var(--color-text-primary)' }}>{sessions ? `${sessions.pct}%` : '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 5 }}>{describeSessionProgress(batch)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  <span>{formatDate(batch.trainingStart) ?? 'Not set'}</span><span>→</span><span>{formatDate(batch.trainingEnd) ?? 'Not set'}</span>
                </div>
                {sessions && <ProgressBar percent={sessions.pct} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  <span>{sessions ? `${sessions.total - Math.min(sessions.held, sessions.total)} sessions remaining` : 'Attendance not recorded yet'}</span>
                  <span>{batch.approvedSeats ? `${batch.scholars}/${batch.approvedSeats} enrolled` : `${batch.scholars} enrolled`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="nm-section">
            <div className="nm-section-title"><Icon name="timeline" size={13} />Lifecycle</div>
            <LifecyclePipeline steps={batch.lifecycle} />
          </div>

          {entre && <BatchEntreSection entre={entre} />}

          <div className="nm-section">
            <div className="nm-section-title"><Icon name="receipt" size={13} />Billing</div>
            <div className="nm-billing" style={{ background: billTone.bg, borderColor: billTone.bd }}>
              <Icon name={billTone.icon} size={22} style={{ color: billTone.fg, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, lineHeight: 1, color: billTone.fg }}>{Number.isFinite(batch.daysToBilling) ? Math.abs(batch.daysToBilling) : '—'}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: billTone.fg, marginTop: 3 }}>
                  {!Number.isFinite(batch.daysToBilling) ? 'no billing deadline recorded' : batch.daysToBilling < 0 ? 'days overdue' : 'days until billing deadline'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: billTone.fg }}>{formatDate(batch.billingDeadline) ?? 'Not recorded'}</div>
                <div style={{ fontSize: 11, color: billTone.fg, opacity: 0.7, marginTop: 2 }}>Submit billing statement</div>
              </div>
            </div>
          </div>

          <BatchScholarsGrid batch={batch} />

          <div className="nm-section">
            <div className="nm-section-title"><Icon name="info-circle" size={13} />Remarks</div>
            <div className="nm-remark">{batch.remark}</div>
          </div>

          <div className="nm-footer">
            <span>Last updated Jun 1, 2026</span>
            <span style={{ color: 'var(--color-border-strong)' }}>·</span>
            <span>{batch.id}</span>
            <button className="btn ghost" style={{ marginLeft: 'auto', height: 28, fontSize: 12, gap: 4 }} onClick={close}>
              <Icon name="x" size={12} />Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchModal;
