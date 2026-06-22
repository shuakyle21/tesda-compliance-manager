'use client';

/**
 * SCREEN — Table View (ported from App.jsx TableView + TableRow)
 *
 * Dense tabular batch list with per-row hover, doc-completeness summary, urgency/
 * billing-ready badge, and click-to-open BatchModal. Client Component.
 */

import { useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TrainerAvatar } from '@/components/ui/TrainerAvatar';
import { UrgencyIndicator, BillingReadyBadge } from '@/components/ui/UrgencyIndicator';
import { BatchModal } from '@/components/ui/BatchModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltersRow } from './FiltersRow';
import { filterBatches } from './filter';
import { DOCUMENT_REQUIREMENTS, isBillingReady } from '@/lib/data/mock-batches';
import type { Batch } from '@/lib/data/types';

export function TableView({ batches }: { batches: Batch[] }) {
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('all');
  const [open, setOpen] = useState<Batch | null>(null);

  const filtered = useMemo(() => filterBatches(batches, query, program), [batches, query, program]);

  return (
    <div>
      <div className="page-head">
        <h1>Table View</h1>
        <span className="subline">{batches.length} active {batches.length === 1 ? 'batch' : 'batches'}</span>
      </div>

      <FiltersRow query={query} onQuery={setQuery} program={program} onProgram={setProgram} />

      {filtered.length === 0 ? (
        <EmptyState heading="No batches match" sub="Try clearing the search or program filter." />
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>Training Batches</h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                {filtered.length} {filtered.length === 1 ? 'batch' : 'batches'}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>2026 cycle</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 56 }} /><col /><col style={{ width: 70 }} /><col style={{ width: 130 }} />
                <col style={{ width: 50 }} /><col style={{ width: 96 }} /><col style={{ width: 110 }} />
                <col style={{ width: 80 }} /><col style={{ width: 100 }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--color-surface-alt)' }}>
                  <Th>ID</Th><Th>Batch · qualification</Th><Th>Program</Th><Th>Trainer</Th>
                  <Th align="right">Sch.</Th><Th>Progress</Th><Th>Billing</Th><Th>Docs</Th><Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => <TableRow key={b.id} batch={b} odd={i % 2 === 0} onClick={() => setOpen(b)} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <BatchModal batch={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align || 'left', padding: '0 12px', height: 36,
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function TableRow({ batch, odd, onClick }: { batch: Batch; odd: boolean; onClick: () => void }) {
  const cellStyle: CSSProperties = {
    padding: '0 12px', height: 44,
    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-primary)',
    borderBottom: '0.5px solid var(--color-border-faint)',
    background: odd ? 'var(--color-surface)' : 'var(--color-surface-alt)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle',
  };

  const crit = DOCUMENT_REQUIREMENTS.filter((r) => r.critical);
  const ok = crit.filter((r) => batch.documents[r.key].status === 'verified').length;
  const pct = Math.round((ok / crit.length) * 100);
  const missing = crit.filter((r) => batch.documents[r.key].status === 'missing').length;
  const docTone = missing > 0 ? 'red' : pct >= 90 ? 'green' : 'amber';

  const onEnter = (e: MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.querySelectorAll('td').forEach((td) => { (td as HTMLElement).style.background = 'var(--color-surface-raised)'; });
  };
  const onLeave = (e: MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.querySelectorAll('td').forEach((td) => { (td as HTMLElement).style.background = ''; });
  };

  return (
    <tr style={{ cursor: 'pointer' }} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{batch.id}</td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 500 }}>{batch.name.replace(/ · Batch \d+$/, '')}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{batch.qualification}</div>
      </td>
      <td style={cellStyle}>
        <StatusBadge variant={batch.program === 'TWSP' ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
      </td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <TrainerAvatar name={batch.trainer} size="sm" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{batch.trainer.split(' ').slice(-1)[0]}</span>
        </div>
      </td>
      <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>{batch.scholars}</td>
      <td style={cellStyle}><ProgressBar percent={batch.progressPct} variant="mini" /></td>
      <td style={cellStyle}>
        {isBillingReady(batch) ? <BillingReadyBadge pulse /> : <UrgencyIndicator days={batch.daysToBilling} variant="badge" />}
      </td>
      <td style={cellStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: `var(--color-${docTone}-dk)` }}>
          <Icon name={missing > 0 ? 'alert-triangle' : 'check'} size={11} />
          {ok}/{crit.length}
        </span>
      </td>
      <td style={{ ...cellStyle, textAlign: 'right' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500, color: 'var(--color-blue-dk)' }}>
          Open <Icon name="chevron-right" size={11} />
        </span>
      </td>
    </tr>
  );
}

export default TableView;
