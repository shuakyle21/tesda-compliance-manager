'use client';

/**
 * SCREEN — Billing (FR-09, ADR-001)
 *
 * Lists each active batch as a billing card: program-aware track chips
 * (Entrepreneurship is CFSP-only), the compound readiness gate (attendance
 * threshold AND supporting docs verified — shown as text + icon, never color
 * alone), and a role/readiness-gated Generate action that opens the statement
 * preview. Client Component — owns the preview-modal and toast state.
 *
 * Design-system note: no left-border urgency accent and no gradient ready-stripe
 * (both rejected as "AI-slop" / banned by the flat-fill rule). Readiness reads
 * from the badge + the gate row.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Toast, type ToastData } from '@/shared/ui/Toast';
import type { BillingCard } from '@/modules/billing/data/billing';
import type { BillingTrackId } from '@/modules/billing/domain/tracks';
import { BillingStatementModal } from './BillingStatementModal';

interface OpenPreview {
  card: BillingCard;
  trackId: BillingTrackId;
}

interface BillingViewProps {
  cards: BillingCard[];
  readOnly?: boolean;
  dataAsOfLabel: string;
  stale?: boolean;
  syncFailed?: boolean;
}

export function BillingView({ cards, readOnly = false, dataAsOfLabel, stale = false, syncFailed = false }: BillingViewProps) {
  const [preview, setPreview] = useState<OpenPreview | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const open = (card: BillingCard, trackId: BillingTrackId) => {
    if (readOnly || !card.gate.ready) return;
    setPreview({ card, trackId });
  };

  const handleSave = (label: string) => {
    setPreview(null);
    setToast({ title: 'Working copy saved', message: `${label} recorded to the generation log (append-only). Nothing was submitted to TESDA.` });
  };

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <span className="subline">
          Document engine · Data as of {dataAsOfLabel}
          {stale && (
            <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-amber) 18%, var(--color-surface))', color: 'var(--color-amber-dk)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>
              STALE
            </span>
          )}
        </span>
      </div>

      {syncFailed && (
        <div style={{ marginBottom: 14 }}>
          <InfoCallout variant="warning">
            Sync with Supabase failed — showing the last cached snapshot.
            <Link href="/billing" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
          </InfoCallout>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <InfoCallout variant="info">
          Prepares Training Cost, TSF/Allowance, and Entrepreneurship documents from verified attendance and supporting documents, using your school&rsquo;s template and signatories. These are internal working copies — TESDA SIS and BSRS remain the authoritative record.
        </InfoCallout>
      </div>

      {readOnly && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          You have read-only access. Document generation is available to coordinators and admins.
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyState
          iconName="receipt"
          heading="No batches ready for billing"
          sub="Billing documents become available once a batch reaches its attendance threshold and its supporting documents are verified."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cards.map((card) => (
            <BillingCardRow key={card.batch.id} card={card} readOnly={readOnly} onOpen={open} />
          ))}
        </div>
      )}

      {preview && (
        <BillingStatementModal
          card={preview.card}
          initialTrackId={preview.trackId}
          readOnly={readOnly}
          onClose={() => setPreview(null)}
          onSave={handleSave}
        />
      )}
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function BillingCardRow({ card, readOnly, onOpen }: { card: BillingCard; readOnly: boolean; onOpen: (c: BillingCard, t: BillingTrackId) => void }) {
  const { gate } = card;
  const canGenerate = gate.ready && !readOnly;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '16px 18px' }}>
      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{card.batch.id}</span>
        <StatusBadge variant={card.isCfsp ? 'cfsp' : 'twsp'}>{card.program}</StatusBadge>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{card.qualification}</span>
        <span style={{ marginLeft: 'auto' }}>
          {gate.ready ? (
            <StatusBadge variant="on-track" iconName="check">READY</StatusBadge>
          ) : (
            <StatusBadge variant="warning" iconName="clock">IN PROGRESS</StatusBadge>
          )}
        </span>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, maxWidth: 340 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <ProgressBar percent={card.progressPct} variant="mini" />
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>training</span>
      </div>

      {/* Track chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {card.tracks.map((t) => {
          const clickable = canGenerate;
          return (
            <button
              key={t.id}
              onClick={() => onOpen(card, t.id)}
              disabled={!clickable}
              title={clickable ? `Generate ${t.label}` : `${t.label} — available once billing-ready`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                padding: '7px 11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-raised)', textAlign: 'left',
                cursor: clickable ? 'pointer' : 'default', opacity: clickable ? 1 : 0.72,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {t.label}
                {clickable && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 500, color: 'var(--color-blue-dk)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Generate</span>
                )}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>{t.basis}</span>
            </button>
          );
        })}
      </div>

      {/* Gate + Generate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--color-border-faint)', paddingTop: 12 }}>
        <GateSignal
          met={gate.thresholdMet}
          text={gate.thresholdMet ? 'Attendance threshold met' : `Below ${gate.progressPct}% — threshold not met`}
        />
        <GateSignal
          met={gate.docsVerified}
          text={gate.docsVerified ? 'Supporting documents on file' : `${gate.verifiedCount}/${gate.requiredTotal} supporting documents on file`}
        />
        <span style={{ marginLeft: 'auto' }}>
          <button
            className="btn primary"
            onClick={() => onOpen(card, card.tracks[0].id)}
            disabled={!canGenerate}
            style={!canGenerate ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            title={readOnly ? 'Read-only access' : gate.ready ? 'Generate billing documents' : 'Batch is not yet billing-ready'}
          >
            <Icon name="file-invoice" size={14} />Generate documents
          </button>
        </span>
      </div>
    </div>
  );
}

function GateSignal({ met, text }: { met: boolean; text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: met ? 'var(--color-green-dk)' : 'var(--color-amber-dk)' }}>
      <Icon name={met ? 'check' : 'clock'} size={14} />
      {text}
    </span>
  );
}

export default BillingView;
