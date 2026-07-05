'use client';

/**
 * OVERLAY — FilePreviewModal (ported from components/FilePreviewModal.jsx)
 *
 * Previews a compliance document with full metadata + a simulated paper page.
 * Footer actions adapt to the document status and the viewer's role: an admin
 * can Verify / Request changes on a submitted doc; a non-admin can Notify admin.
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { StatusBadge, type BadgeVariant } from './StatusBadge';

export interface PreviewFile {
  name: string;
  batchId: string;
  batchName?: string;
  program: string;
  tenantId?: string;
  docKey?: string;
  url: string | null;
  status: string;
  updated: string | null;
  source: string | null;
  critical?: boolean;
  verifiedBy?: string | null;
  verifiedDate?: string | null;
}

const FP_STATUS_META: Record<string, { label: string; variant: BadgeVariant; icon: IconName }> = {
  verified:  { label: 'Verified',  variant: 'on-track',     icon: 'check' },
  submitted: { label: 'Submitted', variant: 'twsp',         icon: 'clock' },
  pending:   { label: 'Pending',   variant: 'warning',      icon: 'clock' },
  missing:   { label: 'Missing',   variant: 'critical',     icon: 'file-off' },
  na:        { label: 'N/A',       variant: 'not-approved', icon: 'minus' },
};

function fpInitials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

interface FilePreviewModalProps {
  file: PreviewFile;
  role?: string;
  canVerify?: boolean;
  adminName?: string | null;
  onVerify?: (f: PreviewFile) => void;
  onRequestChanges?: (f: PreviewFile) => void;
  onNotifyAdmin?: (f: PreviewFile) => void;
  onClose: () => void;
}

export function FilePreviewModal({ file, canVerify, adminName, onVerify, onRequestChanges, onNotifyAdmin, onClose }: FilePreviewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = FP_STATUS_META[file.status] || FP_STATUS_META.na;
  const hasFile = !!file.url && file.status !== 'missing';
  const fileName = (file.name || 'Document').replace(/\s+/g, '_') + '.pdf';
  const SOURCE_LABELS: Record<string, string> = { Supabase: 'Uploaded file', Storage: 'Uploaded file' };
  const sourceLabel = file.source ? (SOURCE_LABELS[file.source] || file.source) : 'Uploaded file';

  return (
    <>
      <div className="scrim" style={{ zIndex: 100 }} onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" style={{ zIndex: 110, width: 680 }}>

        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-secondary)' }}>
              <Icon name="file-text" size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {file.batchId} · {file.program} · {file.critical ? 'Required' : 'Optional'}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close (Esc)" aria-label="Close"><Icon name="x" size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 0', minWidth: 0, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
            {hasFile ? (
              <FPSimulatedPage file={file} fileName={fileName} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Icon name="file-off" size={40} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: 13, marginTop: 10, color: 'var(--color-text-secondary)' }}>No file uploaded</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>This document has not been attached yet.</div>
              </div>
            )}
          </div>

          <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FPMetaRow label="Status">
              <StatusBadge variant={meta.variant}><Icon name={meta.icon} size={11} />{meta.label}</StatusBadge>
            </FPMetaRow>
            <FPMetaRow label="Verified by">
              {file.status === 'verified' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--color-green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.02em' }}>
                    {fpInitials(file.verifiedBy || adminName || 'Admin')}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.verifiedBy || adminName || 'School admin'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                      Admin · accepted {file.verifiedDate || file.updated || '—'}
                    </div>
                  </span>
                </div>
              ) : file.status === 'submitted' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-amber-dk)' }}>
                  <Icon name="clock" size={11} />Awaiting {adminName || 'admin'}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Not yet submitted</span>
              )}
            </FPMetaRow>
            <FPMetaRow label="Batch"><span style={{ fontSize: 12.5, color: 'var(--color-text-primary)' }}>{file.batchName || file.batchId}</span></FPMetaRow>
            <FPMetaRow label="Program"><StatusBadge variant={file.program === 'TWSP' ? 'twsp' : 'cfsp'}>{file.program}</StatusBadge></FPMetaRow>
            <FPMetaRow label="Last updated">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{file.updated || '—'}</span>
            </FPMetaRow>
            <FPMetaRow label="Evidence source">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <Icon name="database" size={11} />{hasFile ? sourceLabel : 'Not uploaded'}
              </span>
            </FPMetaRow>
            <FPMetaRow label="File">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {hasFile ? fileName : '—'}
              </span>
            </FPMetaRow>
          </div>
        </div>

        {file.status === 'submitted' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderTop: '1px solid var(--color-border)', background: 'var(--color-blue-lt)', color: 'var(--color-blue-dk)' }}>
            <Icon name="clock" size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, lineHeight: 1.4, flex: 1 }}>
              {canVerify
                ? 'Submitted for verification. Review the document above, then accept it or send it back for correction.'
                : `Submitted — pending acceptance by ${adminName || 'the school admin'}. Only the school admin can verify this document.`}
            </span>
          </div>
        )}

        <div className="modal-foot">
          <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Icon name={file.status === 'verified' ? 'check' : 'info-circle'} size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.status === 'verified'
                ? `Verified by ${file.verifiedBy || adminName || 'admin'} · ${file.verifiedDate || file.updated || ''}`
                : hasFile ? 'Stored securely · school-level access only' : 'Awaiting upload'}
            </span>
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {hasFile && (
              <button className="btn ghost" title="Download (demo)"><Icon name="download" size={14} />Download</button>
            )}
            {file.status === 'submitted' && canVerify && (
              <>
                <button className="btn secondary" onClick={() => onRequestChanges && onRequestChanges(file)}>
                  <Icon name="refresh" size={14} />Request changes
                </button>
                <button className="btn" onClick={() => onVerify && onVerify(file)} style={{ background: 'var(--color-green)', color: '#fff', borderColor: 'var(--color-green)' }}>
                  <Icon name="check" size={14} />Verify document
                </button>
              </>
            )}
            {file.status === 'submitted' && !canVerify && (
              <button className="btn secondary" onClick={() => onNotifyAdmin && onNotifyAdmin(file)}>
                <Icon name="bell" size={14} />Notify admin
              </button>
            )}
            {file.status !== 'submitted' && (
              <button className="btn primary" onClick={onClose}>Close</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FPMetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function FPSimulatedPage({ file, fileName }: { file: PreviewFile; fileName: string }) {
  return (
    <div style={{ width: '100%', maxWidth: 240, aspectRatio: '8.5 / 11', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 4, boxShadow: 'var(--shadow-md)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-blue)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 4, background: 'var(--color-text-secondary)', borderRadius: 1, width: '70%', marginBottom: 3 }} />
          <div style={{ height: 3, background: 'var(--color-border-strong)', borderRadius: 1, width: '50%' }} />
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 0' }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 8.5, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3, margin: '2px 0' }}>
        {file.name}
      </div>
      {[100, 92, 96, 88, 70].map((w, i) => (
        <div key={i} style={{ height: 3, background: 'var(--color-border)', borderRadius: 1, width: w + '%' }} />
      ))}
      <div style={{ marginTop: 4, border: '1px solid var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
        {[0, 1, 2].map((r) => (
          <div key={r} style={{ display: 'flex', borderBottom: r < 2 ? '1px solid var(--color-border)' : 'none' }}>
            <div style={{ flex: 1, height: 9, background: r === 0 ? 'var(--color-surface-alt)' : '#fff', borderRight: '1px solid var(--color-border)' }} />
            <div style={{ flex: 1, height: 9, background: r === 0 ? 'var(--color-surface-alt)' : '#fff', borderRight: '1px solid var(--color-border)' }} />
            <div style={{ flex: 1, height: 9, background: r === 0 ? 'var(--color-surface-alt)' : '#fff' }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 1, width: '40%', marginBottom: 3 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6, color: 'var(--color-text-muted)' }}>{fileName}</div>
      </div>
      {file.status === 'verified' && (
        <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%) rotate(-12deg)', border: '2px solid var(--color-green)', color: 'var(--color-green)', padding: '3px 10px', borderRadius: 4, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.7 }}>
          VERIFIED
        </div>
      )}
      {file.status === 'submitted' && (
        <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%) rotate(-12deg)', border: '2px dashed var(--color-blue)', color: 'var(--color-blue)', padding: '3px 10px', borderRadius: 4, fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.65, textAlign: 'center' }}>
          FOR REVIEW
        </div>
      )}
    </div>
  );
}

export default FilePreviewModal;
