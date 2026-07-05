/**
 * Document Status Distribution — donut + legend.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4598.
 * Four segments (Verified / Submitted / Pending / Missing) over the required
 * documents, with a centred compliance %. Counts are computed from each
 * batch's `documents` map across DOCUMENT_REQUIREMENTS — data-driven, not traced.
 *
 * The Figma renders the ring as a flattened image; here it's a dependency-free
 * SVG donut (matches the project's "no chart libraries" convention).
 */

import { Icon } from '@/shared/ui/Icon';
import { DOCUMENT_REQUIREMENTS } from '@/shared/mocks';
import type { Batch, DocStatus } from '@/shared/types';

const SEGMENTS: { key: DocStatus; label: string; color: string }[] = [
  { key: 'verified', label: 'Verified', color: 'var(--color-green)' },
  { key: 'submitted', label: 'Submitted', color: 'var(--color-blue)' },
  { key: 'pending', label: 'Pending', color: 'var(--color-amber)' },
  { key: 'missing', label: 'Missing', color: 'var(--color-red)' },
];

export function DocumentStatusDonut({ batches }: { batches: Batch[] }) {
  const counts: Record<DocStatus, number> = { verified: 0, submitted: 0, pending: 0, missing: 0 };
  for (const batch of batches) {
    for (const req of DOCUMENT_REQUIREMENTS) {
      const record = batch.documents[req.key];
      if (record) counts[record.status] += 1;
    }
  }

  const total = Math.max(1, SEGMENTS.reduce((sum, seg) => sum + counts[seg.key], 0));
  // "Compliance" = docs that are in hand (verified + submitted); mirrors the
  // Figma centre value (e.g. 8/12 = 67%).
  const compliancePct = Math.round(((counts.verified + counts.submitted) / total) * 100);

  // Pre-compute donut arcs as percentages; each offset is 100 minus the sum
  // of the preceding segments' percentages (prefix sum, no mutation).
  const pcts = SEGMENTS.map((seg) => (counts[seg.key] / total) * 100);
  const arcs = SEGMENTS.map((seg, i) => ({
    color: seg.color,
    pct: pcts[i],
    offset: 100 - pcts.slice(0, i).reduce((sum, p) => sum + p, 0),
  }));

  return (
    <section className="dash-panel" aria-labelledby="docdist-heading">
      <div className="dash-panel-head">
        <div id="docdist-heading" className="dash-panel-title">
          <Icon name="file-check" size={13} />
          Document Status Distribution
        </div>
        <div className="dash-panel-meta">{total} required docs</div>
      </div>

      <div className="dash-panel-body">
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Donut */}
          <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
            <svg viewBox="0 0 42 42" width={150} height={150} role="img" aria-label={`${compliancePct}% document compliance`}>
              <circle cx="21" cy="21" r="15.91549431" fill="none" stroke="var(--color-surface-alt)" strokeWidth="5" />
              {arcs.map((arc, i) => (
                <circle
                  key={SEGMENTS[i].key}
                  cx="21"
                  cy="21"
                  r="15.91549431"
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="5"
                  strokeDasharray={`${arc.pct} ${100 - arc.pct}`}
                  strokeDashoffset={arc.offset}
                  transform="rotate(-90 21 21)"
                />
              ))}
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, color: 'var(--color-text-secondary)', lineHeight: 1 }}>
                {compliancePct}%
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                verified
              </span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 0 0', minWidth: 130 }}>
            {SEGMENTS.map((seg) => {
              const value = counts[seg.key];
              const pct = Math.round((value / total) * 100);
              return (
                <div key={seg.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                  <span style={{ flex: '1 0 0', minWidth: 0, fontSize: 12, color: 'var(--color-text-primary)' }}>{seg.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-primary)' }}>{value}</span>
                  <span style={{ width: 34, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DocumentStatusDonut;
