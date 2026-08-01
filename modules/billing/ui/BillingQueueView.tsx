'use client';

/**
 * SCREEN — Billing packet queue (FR-09), Figma node 840:5128.
 *
 * Client island because the queue owns two pieces of interaction state: the
 * search box and the selected row that drives the detail panel. Everything it
 * renders is derived by `modules/billing/domain/packets.ts` — this file holds no
 * business rules.
 *
 * DELIBERATE DEVIATIONS from the Figma frame, all recorded in ADR-003:
 *  - "Invoice" → "packet" throughout (P1: there is no invoice entity, and the
 *    reference is a display label, not an accounting document number).
 *  - "Send reminder" → "Flag for follow-up" (P4: in-app only; JJ1 keeps its
 *    no-email/no-cron guarantee).
 *  - "Paid this cycle" → "Recorded as paid" (P3/P6: a user-asserted observation,
 *    never a reconciliation figure).
 *  - The frame's ✓ / ◷ / ● glyphs are rendered as line icons — the design system
 *    forbids emoji and glyph icons.
 */

import { useMemo, useState } from 'react';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { MetricCard } from '@/shared/ui/MetricCard';
import {
  filterPackets,
  formatPeso,
  formatPesoCompact,
  isOverdue,
  summarizePackets,
  type BillingPacket,
  type PacketState,
} from '@/modules/billing/domain/packets';

type BillingRole = 'admin' | 'coordinator' | 'viewer';

interface BillingQueueViewProps {
  packets: BillingPacket[];
  role: BillingRole;
  /** Exact timestamp for the mandated "Data as of" stamp. */
  dataAsOf: string;
  /** Supabase configured but the query failed — surfaces the sync-failed banner. */
  syncFailed?: boolean;
  /** Source data is older than the freshness window. */
  stale?: boolean;
}

const STATE_LABEL: Record<PacketState, string> = {
  draft: 'Awaiting docs',
  ready: 'Ready',
  generated: 'Generated',
  submitted: 'Submitted',
  settled: 'Recorded paid',
};

/** Status is carried by text + icon, never colour alone (design-system rule). */
const STATE_ICON: Record<PacketState, IconName> = {
  draft: 'clock',
  ready: 'check',
  generated: 'file-invoice',
  submitted: 'send',
  settled: 'receipt',
};

function stateChipClass(packet: BillingPacket): string {
  if (isOverdue(packet)) return 'missing';
  switch (packet.state) {
    case 'ready':
      return 'verified';
    case 'settled':
      return 'na';
    case 'generated':
    case 'submitted':
      return 'submitted';
    default:
      return 'pending';
  }
}

export function BillingQueueView({
  packets,
  role,
  dataAsOf,
  syncFailed = false,
  stale = false,
}: BillingQueueViewProps) {
  const [query, setQuery] = useState('');
  const [selectedRef, setSelectedRef] = useState<string | null>(packets[0]?.ref ?? null);

  const summary = useMemo(() => summarizePackets(packets), [packets]);
  const filtered = useMemo(() => filterPackets(packets, query), [packets, query]);
  const selected = filtered.find((p) => p.ref === selectedRef) ?? filtered[0] ?? null;

  // Viewer is read-only. The server route is the real boundary (RLS + role
  // gate); hiding the controls here is usability, not security.
  const canWrite = role !== 'viewer';

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <span className="subline">
          Packet readiness · Data as of {dataAsOf}
          {stale ? ' · STALE' : ''}
        </span>
        {canWrite && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button type="button" className="btn secondary">
              <Icon name="download" size={14} />
              Export summary
            </button>
            <button type="button" className="btn primary" disabled={summary.readyCount === 0}>
              <Icon name="file-invoice" size={14} />
              Generate packet
            </button>
          </div>
        )}
      </div>

      {syncFailed && (
        <InfoCallout variant="warning">
          Could not sync with the school record. Figures below are the last values this
          workspace held and may be out of date.
        </InfoCallout>
      )}

      {role === 'viewer' && (
        <InfoCallout variant="info">
          You have read-only access to billing. Generating and marking packets requires a
          coordinator or admin role.
        </InfoCallout>
      )}

      {/* ---- Summary tiles (ADR-003 P6 — sums over the projection) ---- */}
      <div className="metrics metrics-4">
        <MetricCard
          label="Ready"
          value={formatPesoCompact(summary.ready)}
          sub={`${summary.readyCount} ${summary.readyCount === 1 ? 'packet' : 'packets'} can be generated`}
          iconName="check"
        />
        <MetricCard
          label="Awaiting docs"
          value={formatPesoCompact(summary.pendingReview)}
          sub={`${summary.pendingCount} blocked on documents`}
          iconName="clock"
          variant="warning"
        />
        <MetricCard
          label="Overdue"
          value={formatPesoCompact(summary.overdue)}
          sub={`${summary.overdueCount} past the tranche deadline`}
          iconName="alert-triangle"
          variant="critical"
        />
        {/* ADR-003 P6 — an observation total, not a reconciliation. The sub-label
            says who asserted it so the figure is never read as authoritative. */}
        <MetricCard
          label="Recorded as paid"
          value={formatPesoCompact(summary.settled)}
          sub={`${summary.settledCount} marked settled by a coordinator`}
          iconName="receipt"
        />
      </div>

      <div className="billing-queue-layout">
        {/* ---- Queue ---- */}
        <section className="surface billing-queue" aria-labelledby="packet-queue-heading">
          <div className="billing-queue-head">
            <h2 id="packet-queue-heading" className="billing-queue-title">
              Packet queue
            </h2>
            <span className="doc-status na">
              <Icon name="folders" size={12} />
              {packets.length} total
            </span>
          </div>

          <div className="billing-queue-search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packet, batch, qualification, school…"
              aria-label="Search the packet queue"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              heading="No packets match"
              sub="Try clearing the search to see every batch in this school."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="billing-table">
                <thead>
                  <tr>
                    <th scope="col">Packet</th>
                    <th scope="col">Batch</th>
                    <th scope="col">School</th>
                    <th scope="col" style={{ textAlign: 'right' }}>
                      TSF amount
                    </th>
                    <th scope="col">Due</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((packet) => {
                    const active = selected?.ref === packet.ref;
                    return (
                      <tr
                        key={packet.ref}
                        className={`data-row${active ? ' selected' : ''}`}
                        // aria-current, not aria-selected: the latter is only
                        // meaningful inside role="grid", and declaring a grid
                        // would promise arrow-key navigation this table does not
                        // implement. aria-current is valid on any element and
                        // says exactly what the tint means.
                        aria-current={active ? 'true' : undefined}
                        tabIndex={0}
                        onClick={() => setSelectedRef(packet.ref)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedRef(packet.ref);
                          }
                        }}
                      >
                        <td className="mono data-row-strong">{packet.ref}</td>
                        {/* Qualification leads, as in the Figma "BATCH" column —
                            it is what distinguishes one packet from another; the
                            school name repeats across a school's whole queue. */}
                        <td>
                          <div className="data-row-strong" style={{ fontWeight: 500 }}>
                            {packet.qualification}
                          </div>
                          <div className="billing-table-sub">
                            {packet.batchName} · {packet.program}
                          </div>
                        </td>
                        <td className="mono">{packet.schoolCode}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {formatPeso(packet.amount)}
                        </td>
                        <td className="mono">{packet.dueLabel}</td>
                        <td>
                          <span className={`doc-status ${stateChipClass(packet)}`}>
                            <Icon name={STATE_ICON[packet.state]} size={12} />
                            {isOverdue(packet) ? 'Overdue' : STATE_LABEL[packet.state]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---- Selected packet ---- */}
        <aside className="surface billing-detail" aria-live="polite">
          {selected ? (
            <>
              <h2 className="billing-detail-title">Selected packet</h2>
              <p className="billing-detail-ref mono">
                {selected.ref} · {selected.batchName}
              </p>
              <span className={`doc-status ${stateChipClass(selected)}`}>
                <Icon name={STATE_ICON[selected.state]} size={12} />
                {isOverdue(selected) ? 'Overdue' : STATE_LABEL[selected.state]}
              </span>

              <p className="billing-detail-note">
                {selected.blockers.length === 0
                  ? `All supporting documents are on file and training has reached ${selected.scholars > 0 ? 'the release threshold' : 'completion'}. This packet can be generated.`
                  : selected.blockers.join(' ')}
              </p>

              <ul className="billing-doc-list">
                {selected.docs.map((doc) => (
                  <li key={doc.key}>
                    <span>{doc.label}</span>
                    <span className={`doc-status ${doc.status}`}>
                      <Icon name={doc.satisfied ? 'check' : 'clock'} size={12} />
                      {doc.status}
                    </span>
                  </li>
                ))}
              </ul>

              {canWrite && (
                <div className="billing-detail-actions">
                  <button type="button" className="btn primary">
                    <Icon name="file-check" size={14} />
                    Review documents
                  </button>
                  {/* ADR-003 P4 — in-app follow-up only. This must never become
                      an email action without revisiting JJ1. */}
                  <button type="button" className="btn secondary">
                    <Icon name="bell" size={14} />
                    Flag for follow-up
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              iconName="file-off"
              heading="No packet selected"
              sub="Choose a row in the queue to see its supporting documents."
            />
          )}
        </aside>
      </div>

      <InfoCallout variant="info">
        <strong>Billing rule:</strong> a packet can be generated only once its supporting
        documents are on file and the scholar count matches the batch record. Generating
        appends a new snapshot — it never overwrites an earlier one, so a corrected
        attendance figure produces a new packet rather than editing history.
      </InfoCallout>
    </div>
  );
}

export default BillingQueueView;
