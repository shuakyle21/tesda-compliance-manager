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
 */

import Link from 'next/link';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { DOCUMENT_REQUIREMENTS } from '@/shared/mocks/seed';
import { isBillingReady } from '@/modules/billing/domain/readiness';
import { urgencyTier } from '@/modules/batches/domain/urgency';
import type { Batch } from '@/shared/types';

type Tone = 'green' | 'amber' | 'red';
type AlertRow = { text: string; tone: Tone };

const CRITICAL_DOCS = DOCUMENT_REQUIREMENTS.filter((r) => r.critical);
const TONE_RANK: Record<Tone, number> = { red: 0, amber: 1, green: 2 };
const TONE_ICON: Record<Tone, IconName> = { red: 'alert-triangle', amber: 'alert-circle', green: 'shield-check' };

function batchAlerts(b: Batch): AlertRow[] {
  const rows: AlertRow[] = [];
  // isBillingReady() is the threshold-only prep signal (see readiness.ts) —
  // it does not check documents, so this row must not claim the batch is
  // actually ready to bill. billingGate() is the compound gate for that claim.
  if (isBillingReady(b)) rows.push({ tone: 'green', text: `${b.id} reached the billing progress threshold.` });
  if (b.bsrs) rows.push({ tone: 'green', text: `${b.id} BSRS approved — eligible for billing.` });
  // Same "billing stage already done" guard BatchTimeline uses to hide
  // completed cohorts — without it, a finished batch's now-negative
  // daysToBilling reads as a critical alert instead of disappearing.
  const billDone = b.lifecycle.find((s) => s.key === 'bill')?.status === 'done';
  if (!billDone && urgencyTier(b.daysToBilling) === 'critical') {
    rows.push({ tone: 'red', text: `${b.id} billing window opens in ${b.daysToBilling} days.` });
  }
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
