'use client';

/**
 * OVERLAY — Billing Statement Preview Modal (FR-09, ADR-001 §V2/§W1)
 *
 * The document-generating surface: pick a billing track (Training Cost /
 * TSF-Allowance / Entrepreneurship — the last CFSP-only) and preview the
 * fully-computed statement it would generate — cover header, per-scholar rows,
 * per-component summary, grand total, and amount-in-words. Every figure is
 * derived by `buildStatement` (pure domain), so the preview and the eventual
 * `.docx` share one source of truth. This is an *internal working copy*: copy
 * discipline (ADR-002) keeps it from implying official TESDA standing.
 */

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import type { BillingCard } from '@/modules/billing/data/billing';
import { buildStatement, type StatementColumn } from '@/modules/billing/domain/statement';
import type { BillingTrackId } from '@/modules/billing/domain/tracks';

interface BillingStatementModalProps {
  card: BillingCard;
  initialTrackId: BillingTrackId;
  readOnly?: boolean;
  onClose: () => void;
  onSave?: (label: string) => void;
}

/** Grid track sizing per column role — numerics size to content, name flexes. */
function columnWidth(col: StatementColumn): string {
  if (col.key === 'no') return '40px';
  if (col.key === 'name') return 'minmax(150px, 1fr)';
  if (col.key === 'sex') return '52px';
  return 'minmax(96px, max-content)';
}

function cellAlign(align: StatementColumn['align']): 'left' | 'center' | 'right' {
  return align;
}

export function BillingStatementModal({ card, initialTrackId, readOnly, onClose, onSave }: BillingStatementModalProps) {
  const [trackId, setTrackId] = useState<BillingTrackId>(initialTrackId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const statement = useMemo(
    () => buildStatement(card.batch, trackId, card.tenant),
    [card.batch, card.tenant, trackId],
  );

  const gridTemplate = statement.columns.map(columnWidth).join(' ');

  return (
    <>
      <div className="scrim" style={{ zIndex: 100 }} onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Billing statement for ${card.batch.id}`} style={{ zIndex: 110, width: 820 }}>

        {/* Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--color-blue-lt)', color: 'var(--color-blue-dk)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="file-invoice" size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Billing statement — {statement.trackLabel}</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                {statement.batchId} · internal working copy
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close (Esc)" aria-label="Close"><Icon name="x" size={16} /></button>
        </div>

        {/* Track tabs */}
        <div role="tablist" aria-label="Billing document" style={{ display: 'flex', gap: 6, padding: '10px 18px 0', flexWrap: 'wrap' }}>
          {card.tracks.map((t) => {
            const active = t.id === trackId;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTrackId(t.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 14px',
                  border: '1px solid ' + (active ? 'var(--color-border)' : 'transparent'),
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: active ? 'var(--color-surface)' : 'transparent',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                }}
              >
                {active && <Icon name="file-invoice" size={13} />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Statement body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Cover header */}
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{statement.school}</div>
            {statement.region && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{statement.region}</div>
            )}
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginTop: 12 }}>{statement.programLine}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginTop: 3 }}>{statement.docTitle}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>{statement.subtitle}</div>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, padding: '12px 0', borderTop: '1px solid var(--color-border-faint)', borderBottom: '1px solid var(--color-border-faint)' }}>
            <MetaCell label="Qualification">{statement.qualification}</MetaCell>
            <MetaCell label="Name of trainer">{statement.trainerName}</MetaCell>
            <MetaCell label="RQM code" mono>{statement.rqm}</MetaCell>
            <MetaCell label="Training duration" mono>{statement.period}</MetaCell>
            <MetaCell label="Scholars" mono>{statement.scholarsLabel}</MetaCell>
          </div>

          {/* Scholar table */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              {statement.columns.map((c) => (
                <div key={c.key} style={{ padding: '8px 12px', textAlign: cellAlign(c.align), fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{c.label}</div>
              ))}
            </div>
            {statement.rows.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>No scholar roster available for this batch.</div>
            ) : (
              statement.rows.map((row, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: gridTemplate, background: ri % 2 ? 'var(--color-surface-raised)' : 'var(--color-surface)', borderBottom: ri < statement.rows.length - 1 ? '1px solid var(--color-border-faint)' : 'none' }}>
                  {row.cells.map((cell, ci) => {
                    const col = statement.columns[ci];
                    return (
                      <div key={ci} style={{ padding: '7px 12px', textAlign: cellAlign(col.align), fontFamily: col.mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell}</div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Summary + total + amount in words */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {statement.summary.map((line, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <span>{line.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{line.amount}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 8, borderTop: '1px solid var(--color-border-strong)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>{statement.totalLabel}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{statement.grandTotalLabel}</span>
            </div>
            <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>Amount in words: {statement.grandWords}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Icon name="info-circle" size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Internal working copy · TESDA SIS and BSRS remain authoritative</span>
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {readOnly ? (
              <button className="btn primary" onClick={onClose}>Close</button>
            ) : (
              <>
                <button className="btn secondary" onClick={onClose}>Close</button>
                <button className="btn primary" onClick={() => onSave?.(`${statement.trackLabel} · ${statement.batchId}`)}>
                  <Icon name="download" size={14} />Save working copy
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MetaCell({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-primary)', marginTop: 3 }}>{children}</div>
    </div>
  );
}

export default BillingStatementModal;
