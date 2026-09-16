/**
 * Alerts panel — recent compliance alerts.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4730.
 * Header with a red critical-count badge + "View all", then alert rows
 * (tone icon · one-line sentence — never color alone, per the design system's
 * status rule).
 *
 * TES-93: reconciled against the claude-design source (TVI-CAMS.dc.html
 * `dashVM()`) — alerts are derived live from the same `batches` already
 * driving the rest of the dashboard (billing-ready, BSRS approved, critical
 * billing window, missing critical docs, NTP lag), not a static mock log, so
 * this panel can never drift out of sync with the batches shown alongside it.
 *
 * No per-alert "N days/hours ago" timestamp is shown: the Batch model has no
 * real per-event firing time to derive one from (and this repo forbids
 * `Date.now()` during render), and a fabricated relative stamp next to a
 * live, batch-identified sentence would read as real recency information —
 * worse than the static mock it replaced. Rows are sorted critical-first so
 * critical alerts are the ones kept when the list is cut down to `limit`.
 *
 * TES-94: missing-critical-docs detection now routes through
 * `modules/documents/domain/compliance.ts` (ADR-004) instead of indexing
 * `batch.documents` directly — untracked requirement keys are excluded from
 * the count rather than read as "missing", and the guard checks whether a
 * *critical* document is tracked, not just whether anything is.
 */

import Link from 'next/link';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { batchAlerts, type AlertTone } from '@/modules/batches/domain/alerts';
import { criticalRequirements } from '@/modules/documents/domain/compliance';
import type { Batch, DocumentRequirement } from '@/shared/types';

const TONE_RANK: Record<AlertTone, number> = { red: 0, amber: 1, green: 2 };
const TONE_ICON: Record<AlertTone, IconName> = { red: 'alert-triangle', amber: 'alert-circle', green: 'shield-check' };

export function AlertsPanel({
  batches,
  documentRequirements,
  limit = 5,
}: {
  batches: Batch[];
  documentRequirements: DocumentRequirement[];
  limit?: number;
}) {
  const criticalDocs = criticalRequirements(documentRequirements);
  const allAlerts = batches
    .flatMap((b) => batchAlerts(b, criticalDocs))
    .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
  const alerts = allAlerts.slice(0, limit);
  const criticalCount = allAlerts.filter((a) => a.tone === 'red').length;

  return (
    <section className="dash-panel" aria-labelledby="alerts-heading">
      <div className="dash-panel-head">
        <div id="alerts-heading" className="dash-panel-title">
          <Icon name="bell" size={13} />
          Alerts
          {criticalCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'var(--color-red)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 500,
              }}
            >
              {criticalCount}
            </span>
          )}
        </div>
        <Link href="/activity-log" className="dash-link">View all</Link>
      </div>

      <div className="dash-panel-body" style={{ padding: 0 }}>
        {alerts.length === 0 ? (
          <p className="t-body" style={{ padding: '10px 14px' }}>No alerts — every batch is within its compliance windows.</p>
        ) : (
          alerts.map((a, i) => (
            <div
              key={`${a.text}-${i}`}
              style={{
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderBottom: i < alerts.length - 1 ? '0.5px solid var(--color-border-faint)' : 'none',
              }}
            >
              <span style={{ color: `var(--color-${a.tone})`, flexShrink: 0, marginTop: 2 }}>
                <Icon name={TONE_ICON[a.tone]} size={14} />
              </span>
              <div style={{ minWidth: 0, fontSize: 12, color: 'var(--color-text-primary)', lineHeight: '16.8px' }}>
                {a.tone === 'red' && <span style={{ fontWeight: 600 }}>Critical — </span>}
                {a.text}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default AlertsPanel;
