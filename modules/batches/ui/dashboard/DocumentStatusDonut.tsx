/**
 * Required Document Status — donut + legend.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4598. Each batch
 * is measured against its own program's required-document catalog
 * (`summarizeOwnCatalogCompliance`), with untracked requirements excluded
 * (ADR-004).
 *
 * Renders only when at least one required document is tracked. With nothing
 * tracked the panel used to draw an empty ring beside four "0 · 0%" legend
 * rows — "unknown" and "zero verified" on one card (audit A10). Now: no panel,
 * and the KPI row says "Not yet tracked". A status with no documents gets no
 * legend row; a real zero (tracked, none verified) still reads as data.
 *
 * Dependency-free SVG donut (the project's "no chart libraries" convention).
 */

import { Icon } from '@/shared/ui/Icon';
import { summarizeOwnCatalogCompliance } from '@/modules/documents/domain/compliance';
import type { Batch, DocStatus } from '@/shared/types';

const SEGMENTS: { key: DocStatus; label: string; color: string }[] = [
  { key: 'verified', label: 'Verified', color: 'var(--color-green)' },
  { key: 'submitted', label: 'Submitted', color: 'var(--color-blue)' },
  { key: 'pending', label: 'Pending review', color: 'var(--color-amber)' },
  { key: 'missing', label: 'Missing', color: 'var(--color-red)' },
];

export function DocumentStatusDonut({ batches }: { batches: Batch[] }) {
  const summary = summarizeOwnCatalogCompliance(batches);
  if (summary.tracked === 0 || summary.onFilePct === null) return null;

  const counts: Record<DocStatus, number> = {
    verified: summary.verified,
    submitted: summary.submitted,
    pending: summary.pending,
    missing: summary.missing,
  };
  const total = summary.tracked;
  const present = SEGMENTS.filter((seg) => counts[seg.key] > 0);

  // Each arc's offset is 100 minus the sum of the preceding arcs (prefix sum).
  const pcts = SEGMENTS.map((seg) => (counts[seg.key] / total) * 100);
  const arcs = SEGMENTS.map((seg, i) => ({
    key: seg.key,
    color: seg.color,
    pct: pcts[i],
    offset: 100 - pcts.slice(0, i).reduce((sum, p) => sum + p, 0),
  })).filter((arc) => arc.pct > 0);

  const description = present.map((seg) => `${counts[seg.key]} ${seg.label.toLowerCase()}`).join(', ');

  return (
    <section className="dash-panel" aria-labelledby="docdist-heading">
      <div className="dash-panel-head">
        <h2 id="docdist-heading" className="dash-panel-title">
          <Icon name="file-check" size={13} />
          Required documents
        </h2>
        <div className="dash-panel-meta">
          {summary.tracked} tracked{summary.untracked > 0 ? ` · ${summary.untracked} not tracked` : ''}
        </div>
      </div>

      <div className="dash-panel-body">
        <div className="docdist">
          <div className="docdist-ring">
            <svg viewBox="0 0 42 42" width={136} height={136} role="img"
              aria-label={`${summary.onFilePct}% of tracked required documents on file: ${description}.`}>
              <circle cx="21" cy="21" r="15.91549431" fill="none" stroke="var(--color-surface-alt)" strokeWidth="5" />
              {arcs.map((arc) => (
                <circle key={arc.key} cx="21" cy="21" r="15.91549431" fill="none"
                  stroke={arc.color} strokeWidth="5"
                  strokeDasharray={`${arc.pct} ${100 - arc.pct}`} strokeDashoffset={arc.offset}
                  transform="rotate(-90 21 21)" />
              ))}
            </svg>
            <div className="docdist-centre" aria-hidden="true">
              <span className="docdist-pct">{summary.onFilePct}%</span>
              <span className="docdist-caption">on file</span>
            </div>
          </div>

          <ul className="docdist-legend">
            {present.map((seg) => (
              <li key={seg.key}>
                <span className="docdist-swatch" style={{ background: seg.color }} />
                <span className="docdist-label">{seg.label}</span>
                <span className="docdist-count">{counts[seg.key]}</span>
                <span className="docdist-share">{Math.round((counts[seg.key] / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default DocumentStatusDonut;
