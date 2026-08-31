'use client';

/**
 * OVERLAY — Import CSV (FR-10), ported from the Operations modal's Import
 * body in the design handoff (TVI-CAMS.dc.html, `opModal.isImport`).
 *
 * There is no backend ingestion pipeline yet (`modules/import-export/data/`
 * is unbuilt — see the module README and TES-30). This mirrors the design's
 * own fidelity level: a canned file picker over three fixed outcome samples
 * (success / missing columns / unreadable file) rather than a real T2MIS/BSRS
 * parser, so the flow, copy, and states match exactly without inventing a
 * backend contract nobody has designed yet.
 *
 * States: idle -> picking -> loading -> success | missing | error.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';

type ImportView = 'idle' | 'picking' | 'loading' | 'success' | 'missing' | 'error';
type Outcome = 'success' | 'missing' | 'error';

interface ColumnGroup {
  label: string;
  accent: 'blue' | 'teal' | 'amber' | 'purple' | 'green' | 'neutral';
  cols: string;
}

const GROUPS: ColumnGroup[] = [
  { label: 'Provider / School', accent: 'blue', cols: 'Region · Province · City or municipality · Provider name · Address · Provider type · Registration status · Qualification or program title · CTPR · Delivery mode' },
  { label: 'Scholarship program', accent: 'teal', cols: 'Scholarship type · Industry sector · Cluster (optional) · Training calendar code (optional)' },
  { label: 'Training window', accent: 'amber', cols: 'Date started · Date finished · Date assessed (optional) · Assessment result (optional)' },
  { label: 'Trainer', accent: 'purple', cols: 'Last name · First name · Middle name · Extension (optional) · ULI · Contact number · Email address' },
  { label: 'Scholar / Learner', accent: 'green', cols: 'Last name · First name · Middle name · ULI · Sex · Date of birth · Age · Civil status · Highest grade completed · Nationality · Client classification · Training status · Voucher number (optional) · Street address · Barangay · City or municipality · District · Province' },
  { label: 'Pre/post employment', accent: 'neutral', cols: 'Employment status before training · Date of employment (optional) · Occupation (optional) · Employer name (optional) · Employer address (optional) · Classification (optional) · Salary (optional)' },
];

const SAMPLES: Record<Outcome, {
  key: Outcome;
  name: string;
  meta: string;
  scope?: string;
  total: number;
  added?: number;
  updated?: number;
  skipped?: number;
  successMsg?: string;
  previewCols?: string[];
  previewRows?: string[][];
  missingMsg?: string;
  missingCols?: string[];
  errorMsg?: string;
  errorCode?: string;
}> = {
  success: {
    key: 'success', name: 't2mis_regionIVA_jun2026.csv', meta: '128 records · 96 KB',
    scope: 'Region IV-A · 3 schools', total: 128, added: 124, updated: 38, skipped: 4,
    successMsg: '124 batches added and 38 updated. 4 duplicate scholar records were skipped.',
    previewCols: ['Batch', 'Scholar', 'Program', 'Status'],
    previewRows: [
      ['J3E-TWSP-01', 'Dela Cruz, Maria', 'CFSP', 'Graduated'],
      ['J3E-TWSP-01', 'Bautista, Jose P.', 'CFSP', 'Enrolled'],
      ['AKB-TWSP-03', 'Reyes, Juan M.', 'TWSP', 'Assessed'],
      ['J3E-CFSP-02', 'Santos, Ana L.', 'CFSP', 'Enrolled'],
    ],
  },
  missing: {
    key: 'missing', name: 'batch_records_partial.csv', meta: '42 records · 31 KB', total: 42,
    missingMsg: 'This report is missing three required details for scholars and the provider. Complete them in T2MIS and upload again — nothing was imported.',
    missingCols: ['ULI', 'Provider name', 'Training status'],
  },
  error: {
    key: 'error', name: 'scholars_utf16.csv', meta: '— · 1.2 MB', total: 0,
    errorMsg: 'This file couldn’t be read. Export the report again from T2MIS as a CSV file and upload the new copy.',
    errorCode: 'Reference IMP-2026-0601-14 · quote this if you contact support',
  },
};

const ACCENT_VARS: Record<ColumnGroup['accent'], { border: string; bg: string; fg: string }> = {
  blue: { border: 'var(--color-blue)', bg: 'var(--color-blue-lt)', fg: 'var(--color-blue-dk)' },
  teal: { border: 'var(--color-teal)', bg: 'var(--color-teal-lt)', fg: 'var(--color-teal-dk)' },
  amber: { border: 'var(--color-amber)', bg: 'var(--color-amber-lt)', fg: 'var(--color-amber-dk)' },
  purple: { border: 'var(--color-purple)', bg: 'var(--color-purple-lt)', fg: 'var(--color-purple-dk)' },
  green: { border: 'var(--color-green)', bg: 'var(--color-green-lt)', fg: 'var(--color-green-dk)' },
  neutral: { border: 'var(--color-border)', bg: 'var(--color-surface-alt)', fg: 'var(--color-text-secondary)' },
};

type Sample = (typeof SAMPLES)[Outcome];

interface ImportCsvModalProps {
  onClose: () => void;
  onImported: (message: string) => void;
}

export function ImportCsvModal({ onClose, onImported }: ImportCsvModalProps) {
  const [view, setView] = useState<ImportView>('idle');
  const [file, setFile] = useState<{ name: string; meta: string } | null>(null);
  const [pct, setPct] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const barTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (barTimer.current) clearInterval(barTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseSample(key: Outcome) {
    const s = SAMPLES[key];
    if (barTimer.current) clearInterval(barTimer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);
    setView('loading');
    setFile({ name: s.name, meta: s.meta });
    setPct(0);
    setOutcome(key);
    const step = key === 'error' ? 9 : 7;
    barTimer.current = setInterval(() => {
      setPct((p) => Math.min(100, p + step));
    }, 120);
    doneTimer.current = setTimeout(() => {
      if (barTimer.current) clearInterval(barTimer.current);
      setPct(100);
      setView(key);
    }, key === 'error' ? 1300 : 1900);
  }

  function retry() {
    if (barTimer.current) clearInterval(barTimer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);
    setView('picking');
    setFile(null);
    setPct(0);
  }

  function finishImport() {
    const s = outcome ? SAMPLES[outcome] : null;
    onImported(`${s?.added ?? 0} batches updated · ${s?.scope ?? ''}`);
  }

  const samp = outcome ? SAMPLES[outcome] : null;
  const loadingLabel = pct < 55 ? 'Parsing CSV…' : pct < 92 ? 'Saving records…' : 'Finalizing…';

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Import batch records">
        <div className="modal-head">
          <h3>Import batch records</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ImportBody view={view} file={file} samp={samp} pct={pct} loadingLabel={loadingLabel} onPick={() => setView('picking')} onChoose={chooseSample} />
        </div>

        <div className="modal-foot">
          <ImportFooterStatus view={view} file={file} samp={samp} />
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <ImportFooterActions view={view} onClose={onClose} onBack={() => setView('idle')} onRetry={retry} onFinish={finishImport} onStartPicking={() => setView('picking')} />
          </div>
        </div>
      </div>
    </>
  );
}

interface ImportBodyProps {
  view: ImportView;
  file: { name: string; meta: string } | null;
  samp: Sample | null;
  pct: number;
  loadingLabel: string;
  onPick: () => void;
  onChoose: (key: Outcome) => void;
}

function ImportBody({ view, file, samp, pct, loadingLabel, onPick, onChoose }: ImportBodyProps) {
  switch (view) {
    case 'idle':
      return <ImportIdleView onPick={onPick} />;
    case 'picking':
      return <ImportPickingView onChoose={onChoose} />;
    case 'loading':
      return file ? <ImportLoadingView file={file} pct={pct} loadingLabel={loadingLabel} samp={samp} /> : null;
    case 'success':
      return samp ? <ImportSuccessView samp={samp} /> : null;
    case 'missing':
      return samp && file ? <ImportMissingView samp={samp} file={file} /> : null;
    case 'error':
      return samp ? <ImportErrorView samp={samp} /> : null;
    default:
      return null;
  }
}

function ImportIdleView({ onPick }: { onPick: () => void }) {
  return (
    <>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
        Upload the official T2MIS or BSRS report for this cycle.
      </span>
      <button type="button" className="upload-zone" onClick={onPick} aria-label="Select CSV file">
        <Icon name="download" size={20} style={{ color: 'var(--color-text-secondary)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginTop: 4 }}>
          Drop CSV here or click to browse
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
          CSV · up to 5 MB
        </span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <Icon name="info-circle" size={14} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>
          Information the report must include
        </span>
      </div>
      <div className="import-col-groups">
        {GROUPS.map((g) => {
          const v = ACCENT_VARS[g.accent];
          return (
            <div key={g.label} className="import-col-group" style={{ '--group-border': v.border } as React.CSSProperties}>
              <div className="import-col-group-head" style={{ '--group-bg': v.bg } as React.CSSProperties}>
                <span className="import-col-group-label" style={{ '--group-fg': v.fg } as React.CSSProperties}>{g.label}</span>
              </div>
              <div className="import-col-group-cols">{g.cols}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ImportPickingView({ onChoose }: { onChoose: (key: Outcome) => void }) {
  return (
    <>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
        Choose a report to sync. Each one is checked for the required information before anything is imported.
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(Object.keys(SAMPLES) as Outcome[]).map((key) => {
          const s = SAMPLES[key];
          return (
            <button key={key} type="button" className="import-sample-row" onClick={() => onChoose(key)}>
              <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-green-lt)', color: 'var(--color-green-dk)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="file-text" size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{s.name}</span>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{s.meta}</span>
              </span>
              <Icon name="chevron-right" size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          );
        })}
      </div>
    </>
  );
}

interface ImportLoadingViewProps {
  file: { name: string; meta: string };
  pct: number;
  loadingLabel: string;
  samp: Sample | null;
}

function ImportLoadingView({ file, pct, loadingLabel, samp }: ImportLoadingViewProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-alt)' }}>
        <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border-faint)' }}>
          <Icon name="file-text" size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{file.meta}</div>
        </div>
        <span className="spinner" aria-hidden="true" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text-primary)' }}>{loadingLabel}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{Math.min(100, Math.round(pct))}%</span>
        </div>
        <div className="import-progress-track">
          <div className="import-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
          {samp ? `Checking required information · ${samp.scope ?? ''}` : ''}
        </span>
      </div>
    </>
  );
}

function ImportSuccessView({ samp }: { samp: Sample }) {
  const skippedStyle = (samp.skipped ?? 0) > 0
    ? { '--stat-border': 'var(--color-amber-border)', '--stat-bg': 'var(--color-amber-lt)', '--stat-fg': 'var(--color-amber-dk)' } as React.CSSProperties
    : { '--stat-border': 'var(--color-border)', '--stat-bg': 'var(--color-surface-alt)', '--stat-fg': 'var(--color-text-secondary)' } as React.CSSProperties;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: 13, border: '1px solid var(--color-green-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-green-lt)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 9999, background: 'var(--color-green)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="check" size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-green-dk)' }}>Sync complete</div>
          <div style={{ fontSize: 12, color: 'var(--color-green-dk)', opacity: 0.85, marginTop: 2, lineHeight: 1.45 }}>{samp.successMsg}</div>
        </div>
      </div>
      <div className="import-stats">
        <div className="import-stat" style={{ '--stat-border': 'var(--color-green-border)', '--stat-bg': 'var(--color-green-lt)', '--stat-fg': 'var(--color-green-dk)' } as React.CSSProperties}>
          <div className="import-stat-value">{samp.added}</div>
          <div className="import-stat-label">batches added</div>
        </div>
        <div className="import-stat" style={{ '--stat-border': 'var(--color-blue-border)', '--stat-bg': 'var(--color-blue-lt)', '--stat-fg': 'var(--color-blue-dk)' } as React.CSSProperties}>
          <div className="import-stat-value">{samp.updated}</div>
          <div className="import-stat-label">records updated</div>
        </div>
        <div className="import-stat" style={skippedStyle}>
          <div className="import-stat-value">{samp.skipped}</div>
          <div className="import-stat-label">skipped</div>
        </div>
      </div>
      <div className="import-preview-table">
        <div className="import-preview-head">
          {samp.previewCols?.map((h) => <span key={h}>{h}</span>)}
        </div>
        {samp.previewRows?.map((row, i) => (
          <div className="import-preview-row" key={i}>
            {row.map((cell, j) => <span key={j}>{cell}</span>)}
          </div>
        ))}
      </div>
    </>
  );
}

function ImportMissingView({ samp, file }: { samp: Sample; file: { name: string; meta: string } }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: 13, border: '1px solid var(--color-amber-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-amber-lt)' }}>
        <span style={{ flexShrink: 0, color: 'var(--color-amber-dk)' }}><Icon name="alert-triangle" size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-amber-dk)' }}>Missing required columns</div>
          <div style={{ fontSize: 12, color: 'var(--color-amber-dk)', opacity: 0.88, marginTop: 2, lineHeight: 1.45 }}>{samp.missingMsg}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-alt)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border-faint)' }}>
          <Icon name="file-text" size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text-primary)' }}>{file.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{file.meta}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Required but not found
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {samp.missingCols?.map((c) => <span key={c} className="import-missing-chip">{c}</span>)}
        </div>
      </div>
    </>
  );
}

function ImportErrorView({ samp }: { samp: Sample }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '26px 18px', textAlign: 'center' }}>
      <span style={{ width: 48, height: 48, borderRadius: 9999, background: 'var(--color-red-lt)', color: 'var(--color-red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="alert-circle" size={22} />
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Couldn&rsquo;t read this file</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.5, maxWidth: 380 }}>{samp.errorMsg}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border-faint)', borderRadius: 'var(--radius-md)', padding: '8px 11px' }}>
        {samp.errorCode}
      </div>
    </div>
  );
}

interface ImportFooterStatusProps {
  view: ImportView;
  file: { name: string; meta: string } | null;
  samp: Sample | null;
}

function ImportFooterStatus({ view, file, samp }: ImportFooterStatusProps) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
      {view === 'picking' && '3 reports available'}
      {view === 'loading' && file?.name}
      {(view === 'success' || view === 'missing') && `${samp?.total ?? 0} records reviewed`}
    </div>
  );
}

interface ImportFooterActionsProps {
  view: ImportView;
  onClose: () => void;
  onBack: () => void;
  onRetry: () => void;
  onFinish: () => void;
  onStartPicking: () => void;
}

function ImportFooterActions({ view, onClose, onBack, onRetry, onFinish, onStartPicking }: ImportFooterActionsProps) {
  if (view === 'idle') {
    return <button type="button" className="btn primary" onClick={onStartPicking}>Select file&hellip;</button>;
  }
  if (view === 'picking') {
    return <button type="button" className="btn ghost" onClick={onBack}>Back</button>;
  }
  if (view === 'loading') {
    return <button type="button" className="btn ghost" onClick={onRetry}>Cancel</button>;
  }
  if (view === 'success') {
    return (
      <>
        <button type="button" className="btn secondary" onClick={onRetry}>Import another</button>
        <button type="button" className="btn primary" onClick={onFinish}>Done</button>
      </>
    );
  }
  if (view === 'missing') {
    return (
      <>
        <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn primary" onClick={onRetry}>Choose another file</button>
      </>
    );
  }
  if (view === 'error') {
    return (
      <>
        <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn primary" onClick={onRetry}>Try another file</button>
      </>
    );
  }
  return null;
}

export default ImportCsvModal;
