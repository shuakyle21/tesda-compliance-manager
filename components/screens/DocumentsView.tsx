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
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InfoCallout } from '@/components/ui/InfoCallout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast, type ToastData } from '@/components/ui/Toast';
import { FilePreviewModal, type PreviewFile } from '@/components/ui/FilePreviewModal';
import { DOCUMENT_REQUIREMENTS } from '@/lib/data/mock-batches';
import type { Batch, DocRecord, DocumentRequirement } from '@/lib/data/types';

const STATUS_LABEL: Record<string, string> = {
  verified: 'Verified', submitted: 'Submitted', pending: 'Pending', missing: 'Missing', na: 'N/A',
};

// Single demo identity — an admin (proprietor) who can verify documents.
const CURRENT_USER = 'Pia Buenaventura';

export function DocumentsView({ batches }: { batches: Batch[] }) {
  // Verification overrides keyed `${batchId}:${docKey}`.
  const [overrides, setOverrides] = useState<Record<string, Partial<DocRecord>>>({});
  const [preview, setPreview] = useState<PreviewFile | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const isWriter = true; // admin/coordinator
  const canVerify = true; // admin

  const docOf = (b: Batch, key: string): DocRecord => {
    const base = b.documents[key];
    const ov = overrides[b.id + ':' + key];
    return ov ? { ...base, ...ov } : base;
  };

  const completeness = useMemo(() => batches.map((b) => {
    const crit = DOCUMENT_REQUIREMENTS.filter((r) => r.critical);
    const ok = crit.filter((r) => docOf(b, r.key).status === 'verified').length;
    const pct = Math.round((ok / crit.length) * 100);
    const missing = crit.filter((r) => docOf(b, r.key).status === 'missing').length;
    const tier = pct >= 90 ? 'on-track' : pct >= 60 ? 'warning' : 'critical';
    return { ok, total: crit.length, pct, missing, tier };
  }), [batches, overrides]);

  if (!batches.length) {
    return (
      <div>
        <Header />
        <EmptyState heading="No batches found" sub="Try adjusting your filters." />
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
      <InfoCallout variant="info">
        Document audit follows TESDA Circular 014-2026. Critical documents are required for billing release; missing items block the BSRS submission.
      </InfoCallout>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: 12, margin: '16px 0' }}>
        {batches.map((b, i) => {
          const c = completeness[i];
          return (
            <div key={b.id} style={{
              padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderLeft: '3px solid ' + (c.tier === 'critical' ? 'var(--color-red)' : c.tier === 'warning' ? 'var(--color-amber)' : 'var(--color-green)'),
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
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.pct}%</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>{c.ok}/{c.total} critical</span>
              </div>
              <div className={'completeness-bar ' + (c.tier === 'on-track' ? '' : c.tier)}>
                <span style={{ width: c.pct + '%' }} />
              </div>
              {c.missing > 0 && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-red-dk)' }}>
                  <Icon name="alert-triangle" size={11} />{c.missing} missing
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

        {DOCUMENT_REQUIREMENTS.map((req) => (
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
              const s = doc.status;
              return (
                <div key={b.id} className="cell" style={{ justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className={'doc-status ' + s}
                    onClick={() => onCellClick(b, req)}
                    title={doc.updated ? `${STATUS_LABEL[s]} · updated ${doc.updated} · ${doc.source}` : (isWriter ? 'Click to attach' : 'Document not yet provided')}
                  >
                    <Icon name={s === 'verified' ? 'check' : s === 'submitted' ? 'clock' : s === 'pending' ? 'clock' : 'file-off'} size={11} />
                    {STATUS_LABEL[s]}
                  </button>
                  {doc.updated && (
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

function Header() {
  return (
    <div className="page-head">
      <h1>Documents</h1>
      <span className="subline">TESDA Circular 014-2026 · critical docs gate billing</span>
    </div>
  );
}

export default DocumentsView;
