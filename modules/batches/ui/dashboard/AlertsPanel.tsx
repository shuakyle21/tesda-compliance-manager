/**
 * Alerts panel — recent compliance alerts.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4730.
 * Header with a red critical-count badge + "View all", then alert rows
 * (tone dot · one-line sentence).
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
 * the header's red count always matches what's visible after `limit`.
 */

import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import { DOCUMENT_REQUIREMENTS } from '@/shared/mocks/seed';
import { isBillingReady } from '@/modules/billing/domain/readiness';
import { urgencyTier } from '@/modules/batches/domain/urgency';
import type { Batch } from '@/shared/types';

type Tone = 'green' | 'amber' | 'red';
type AlertRow = { text: string; tone: Tone };

const CRITICAL_DOCS = DOCUMENT_REQUIREMENTS.filter((r) => r.critical);
const TONE_RANK: Record<Tone, number> = { red: 0, amber: 1, green: 2 };

function batchAlerts(b: Batch): AlertRow[] {
  const rows: AlertRow[] = [];
  if (isBillingReady(b)) rows.push({ tone: 'green', text: `${b.id} reached 80%+ training progress — ready for billing.` });
  if (b.bsrs) rows.push({ tone: 'green', text: `${b.id} BSRS approved — eligible for billing.` });
  if (urgencyTier(b.daysToBilling) === 'critical') rows.push({ tone: 'red', text: `${b.id} billing window opens in ${b.daysToBilling} days.` });
  // Only flag missing critical docs once this batch's documents are actually
  // tracked — an empty `documents` map means "not synced yet", not "none
  // missing" (see the docsTracked guard in page.tsx for the same distinction).
  if (Object.keys(b.documents).length > 0) {
    const missing = CRITICAL_DOCS.filter((r) => b.documents[r.key]?.status === 'missing').length;
    if (missing > 0) rows.push({ tone: 'amber', text: `${b.id} missing ${missing} critical document${missing > 1 ? 's' : ''}.` });
  }
  if (b.ntpLag > 7) rows.push({ tone: 'red', text: `${b.id} NTP-to-start lag exceeded 7 days.` });
  return rows;
}

export function AlertsPanel({ batches, limit = 5 }: { batches: Batch[]; limit?: number }) {
  const allAlerts = batches.flatMap(batchAlerts).sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
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
              <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0, background: `var(--color-${a.tone})` }} aria-hidden="true" />
              <div style={{ minWidth: 0, fontSize: 12, color: 'var(--color-text-primary)', lineHeight: '16.8px' }}>{a.text}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default AlertsPanel;
