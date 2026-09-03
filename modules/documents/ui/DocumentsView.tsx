'use client';

/**
 * SCREEN — Documents matrix (ported from components/DocumentsView.jsx + App.jsx
 * verify flow)
 *
 * Rows = required document types, columns = batches. Each cell is a status pill;
 * clicking a verified/submitted cell opens the FilePreviewModal. An admin can
 * accept a submitted document — the "verified" status (+ attribution) then flows
 * through the matrix and the preview via local override state. Client Component.
 */

import { useMemo, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Toast, type ToastData } from '@/shared/ui/Toast';
import { FilePreviewModal, type PreviewFile } from '@/shared/ui/FilePreviewModal';
import { criticalRequirements, docRecordFor } from '@/modules/documents/domain/compliance';
import type { Batch, DocRecord, DocumentRequirement } from '@/shared/types';

const STATUS_LABEL: Record<string, string> = {
  verified: 'Verified', submitted: 'Submitted', pending: 'Pending', missing: 'Missing', na: 'N/A',
};

// A requirement this batch does not track (ADR-004). Rendered with the muted
// `.doc-status.na` treatment — deliberately not "Missing", which asserts a
// document is absent when in fact nothing was ever required or recorded here.
const UNTRACKED_LABEL = 'Not tracked';

// Single demo identity — an admin (proprietor) who can verify documents.
const CURRENT_USER = 'Pia Buenaventura';

export function DocumentsView({
  batches,
  documentRequirements,
  syncFailed = false,
}: {
  batches: Batch[];
  /**
   * The requirement catalog driving the matrix rows. Supplied by the route —
   * this view never falls back to a bundled catalog, so an unavailable one
   * renders the honest "requirements unavailable" state below rather than an
   * invented checklist.
   */
  documentRequirements: DocumentRequirement[];
  syncFailed?: boolean;
}) {
  // Verification overrides keyed `${batchId}:${docKey}`.
  const [overrides, setOverrides] = useState<Record<string, Partial<DocRecord>>>({});
  const [preview, setPreview] = useState<PreviewFile | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const isWriter = true; // admin/coordinator
  const canVerify = true; // admin

  /**
   * The record for a cell, or `null` when this batch does not track the
   * requirement at all (ADR-004 — untracked is neither verified nor missing;
   * the matrix renders it as its own muted "Not tracked" pill). An override
   * can only refine a record that exists.
   */
  const docOf = (b: Batch, key: string): DocRecord | null => {
    const base = docRecordFor(b, key);
    if (!base) return null;
    const ov = overrides[b.id + ':' + key];
    return ov ? { ...base, ...ov } : base;
  };

  const completeness = useMemo(() => batches.map((b) => {
    // Counted over *tracked* critical requirements only; `pct` is null when a
    // batch tracks none of them, so the card reads "—" rather than 0%.
    const crit = criticalRequirements(documentRequirements);
    const records = crit.map((r) => docOf(b, r.key));
    const tracked = records.filter((d): d is DocRecord => d !== null);
    const ok = tracked.filter((d) => d.status === 'verified').length;
    const pct = tracked.length ? Math.round((ok / tracked.length) * 100) : null;
    const missing = tracked.filter((d) => d.status === 'missing').length;
    const untracked = crit.length - tracked.length;
    const tier = pct === null ? 'untracked' : pct >= 90 ? 'on-track' : pct >= 60 ? 'warning' : 'critical';
    return { ok, total: tracked.length, untracked, pct, missing, tier };
  }), [batches, documentRequirements, overrides]);

  if (!batches.length) {
    return (
      <div>
        <Header />
        <SyncFailedCallout syncFailed={syncFailed} />
        <EmptyState heading="No batches found" sub="Try adjusting your filters." />
      </div>
    );
  }

  // No requirement catalog means no rows to audit against. Rendering the grid
  // with headers and zero rows would read as "this batch requires nothing",
  // and every completeness card would show a bare "—"; one honest state is
  // clearer (ADR-004 — unknown is not zero).
  if (!documentRequirements.length) {
    return (
      <div>
        <Header />
        <SyncFailedCallout syncFailed={syncFailed} />
        <EmptyState
          iconName="file-off"
          heading="Document requirements unavailable"
          sub="The requirement checklist for these batches has not loaded, so document status cannot be audited yet."
        />
      </div>
    );
  }

  const buildPreview = (b: Batch, req: DocumentRequirement, doc: DocRecord): PreviewFile => ({
    name: req.label, batchId: b.id, batchName: b.name, program: b.program,
    tenantId: b.tenantId, docKey: req.key, url: doc.url, status: doc.status,
    updated: doc.updated, source: doc.source, critical: req.critical,
    verifiedBy: doc.verifiedBy || null, verifiedDate: doc.verifiedDate || null,
  });

  const onCellClick = (b: Batch, req: DocumentRequirement) => {
    const doc = docOf(b, req.key);
    if (!doc) return; // untracked — nothing to preview and nothing to attach against
    if (doc.status === 'verified' || doc.status === 'submitted') setPreview(buildPreview(b, req, doc));
    else if (isWriter) setToast({ title: 'Attach document', message: `Open uploader ⇢ ${b.id} · ${req.label}` });
  };

  const handleVerify = (file: PreviewFile) => {
    const today = 'May 31';
    setOverrides((prev) => ({
      ...prev,
      [file.batchId + ':' + file.docKey]: { status: 'verified', verifiedBy: CURRENT_USER, verifiedDate: today, updated: today, source: file.source || 'Uploaded file' },
    }));
    setPreview((fp) => (fp ? { ...fp, status: 'verified', verifiedBy: CURRENT_USER, verifiedDate: today, updated: today } : fp));
    setToast({ title: 'Document verified', message: `${file.name} accepted by ${CURRENT_USER}. Registrar notified.` });
  };
  const handleRequestChanges = (file: PreviewFile) => {
    setToast({ title: 'Changes requested', message: `${file.name} returned to the uploader. Registrar notified to re-submit.` });
    setPreview(null);
  };

  const colCount = batches.length;
  const gridStyle = { gridTemplateColumns: `260px repeat(${colCount}, minmax(0, 1fr))` };

  return (
    <div>
      <Header />
      <SyncFailedCallout syncFailed={syncFailed} />
      <InfoCallout variant="info">
        Document audit follows TESDA Circular 014-2026. Critical documents are required for billing release; missing items block the BSRS submission.
      </InfoCallout>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: 12, margin: '16px 0' }}>
        {batches.map((b, i) => {
          const c = completeness[i];
          return (
            <div key={b.id} style={{
              padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderLeft: '3px solid ' + (c.tier === 'untracked' ? 'var(--color-border-strong)' : c.tier === 'critical' ? 'var(--color-red)' : c.tier === 'warning' ? 'var(--color-amber)' : 'var(--color-green)'),
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{b.id}</span>
                <StatusBadge variant={b.program === 'TWSP' ? 'twsp' : 'cfsp'}>{b.program}</StatusBadge>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.name.replace(/ · Batch \d+$/, '')}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {c.pct === null ? '—' : `${c.pct}%`}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  {c.pct === null ? 'no critical docs tracked' : `${c.ok}/${c.total} critical`}
                </span>
              </div>
              {/* 'untracked' has no fill variant — an unknown score renders as
                  the empty track (width 0), with the "—" and the "not tracked"
                  line above carrying the meaning in words. */}
              <div className={'completeness-bar ' + (c.tier === 'on-track' || c.tier === 'untracked' ? '' : c.tier)}>
                <span style={{ width: (c.pct ?? 0) + '%' }} />
              </div>
              {c.missing > 0 && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-red-dk)' }}>
                  <Icon name="alert-triangle" size={11} />{c.missing} missing
                </div>
              )}
              {c.untracked > 0 && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  <Icon name="info-circle" size={11} />{c.untracked} not tracked
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="doc-grid" style={gridStyle}>
        <div className="doc-grid-head">
          <div>Document</div>
          {batches.map((b) => (
            <div key={b.id} style={{ justifyContent: 'space-between' }}>
              <span>{b.id}</span>
              <span style={{ fontFamily: 'var(--font-mono)', textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'var(--color-text-muted)' }}>{b.program}</span>
            </div>
          ))}
        </div>

        {documentRequirements.map((req) => (
          <div key={req.key} className="doc-row" style={gridStyle}>
            <div className={'cell label-cell' + (req.critical ? ' critical' : '')}>
              <Icon name={req.icon as never} size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>
                  {req.critical ? 'Required' : 'Optional'} · stage {req.stage}
                </div>
              </span>
            </div>
            {batches.map((b) => {
              const doc = docOf(b, req.key);
              const s = doc?.status ?? 'na';
              return (
                <div key={b.id} className="cell" style={{ justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className={'doc-status ' + s}
                    onClick={() => onCellClick(b, req)}
                    disabled={!doc}
                    title={!doc
                      ? 'This batch does not track this document. Its programme requirement catalog has no entry for it.'
                      : doc.updated ? `${STATUS_LABEL[s]} · updated ${doc.updated} · ${doc.source}` : (isWriter ? 'Click to attach' : 'Document not yet provided')}
                  >
                    <Icon name={!doc ? 'info-circle' : s === 'verified' ? 'check' : s === 'submitted' ? 'clock' : s === 'pending' ? 'clock' : 'file-off'} size={11} />
                    {doc ? STATUS_LABEL[s] : UNTRACKED_LABEL}
                  </button>
                  {doc?.updated && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{doc.updated}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {preview && (
        <FilePreviewModal
          file={preview}
          canVerify={canVerify}
          adminName={CURRENT_USER}
          onVerify={handleVerify}
          onRequestChanges={handleRequestChanges}
          onClose={() => setPreview(null)}
        />
      )}
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function SyncFailedCallout({ syncFailed }: { syncFailed: boolean }) {
  if (!syncFailed) return null;
  return (
    <InfoCallout variant="warning">
      Sync with the compliance database failed, so no document status is shown. Reload to try again.
    </InfoCallout>
  );
}

function Header() {
  return (
    <div className="page-head">
      <h1>Documents</h1>
      <span className="subline">TESDA Circular 014-2026 · critical docs gate billing</span>
    </div>
  );
}

export default DocumentsView;
