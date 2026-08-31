'use client';

/**
 * SCREEN — Billing packet queue (FR-09), Figma node 840:5128.
 *
 * Client island because the queue owns the interaction state: the search box,
 * the selected row that drives the detail panel, and (TES-70) the statement
 * preview modal + its save toast. Everything it renders is derived by
 * `modules/billing/domain/packets.ts` (rows) and `data/billing.ts` (preview
 * cards) — this file holds no business rules.
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
import { Toast, type ToastData } from '@/shared/ui/Toast';
import {
  filterPackets,
  formatPeso,
  formatPesoCompact,
  isOverdue,
  summarizePackets,
  type BillingPacket,
  type PacketState,
  type PacketSummary,
} from '@/modules/billing/domain/packets';
import type { BillingCard } from '@/modules/billing/data/billing';
import { BillingStatementModal } from './BillingStatementModal';

type BillingRole = 'admin' | 'coordinator' | 'viewer';

interface BillingQueueViewProps {
  packets: BillingPacket[];
  /**
   * Statement-preview inputs, keyed to packets via `batch.id`. Optional so the
   * queue renders without the engine (e.g. in isolation); without cards the
   * generate/preview actions stay inert exactly as before TES-70.
   */
  cards?: BillingCard[];
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

function useBillingQueueSelection(
  packets: BillingPacket[],
  cards: BillingCard[] | undefined,
  query: string,
  selectedRef: string | null,
) {
  const summary = useMemo(() => summarizePackets(packets), [packets]);
  const filtered = useMemo(() => filterPackets(packets, query), [packets, query]);
  const selected = filtered.find((p) => p.ref === selectedRef) ?? filtered[0] ?? null;

  // Preview inputs, joined on batch id. The packet is the ADR-003 queue
  // projection; the card is what `buildStatement` derives the document from.
  const cardByBatch = useMemo(() => new Map((cards ?? []).map((c) => [c.batch.id, c])), [cards]);
  const selectedCard = selected ? cardByBatch.get(selected.batchId) ?? null : null;
  // The card's compound gate (ADR-001 §Ready) governs generation, not the
  // packet chip — both derive from the same batch, but the gate is the rule.
  const selectedGenerable = Boolean(selectedCard?.gate.ready);
  const firstGenerableCard =
    packets.map((p) => cardByBatch.get(p.batchId)).find((c) => c?.gate.ready) ?? null;

  return { summary, filtered, selected, selectedCard, selectedGenerable, firstGenerableCard };
}

function BillingQueueBanners({ syncFailed, role }: { syncFailed: boolean; role: BillingRole }) {
  return (
    <>
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
    </>
  );
}

function BillingQueueHeader({
  dataAsOf,
  stale,
  canWrite,
  summary,
  hasCards,
  onGenerate,
}: {
  dataAsOf: string;
  stale: boolean;
  canWrite: boolean;
  summary: PacketSummary;
  hasCards: boolean;
  onGenerate: () => void;
}) {
  return (
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
          <button
            type="button"
            className="btn primary"
            disabled={summary.readyCount === 0 || !hasCards}
            onClick={onGenerate}
          >
            <Icon name="file-invoice" size={14} />
            Generate packet
          </button>
        </div>
      )}
    </div>
  );
}

/* ---- Summary tiles (ADR-003 P6 — sums over the projection) ---- */
function BillingSummaryTiles({ summary }: { summary: PacketSummary }) {
  return (
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
  );
}

function BillingPacketQueueSection({
  packets,
  filtered,
  query,
  onQueryChange,
  activeRef,
  onSelectRef,
}: {
  packets: BillingPacket[];
  filtered: BillingPacket[];
  query: string;
  onQueryChange: (value: string) => void;
  activeRef: string | null;
  onSelectRef: (ref: string) => void;
}) {
  return (
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
          onChange={(e) => onQueryChange(e.target.value)}
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
                const active = packet.ref === activeRef;
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
                    onClick={() => onSelectRef(packet.ref)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRef(packet.ref);
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
  );
}

function BillingPacketDetailPanel({
  selected,
  canWrite,
  selectedGenerable,
  onPreview,
}: {
  selected: BillingPacket | null;
  canWrite: boolean;
  selectedGenerable: boolean;
  onPreview: () => void;
}) {
  if (!selected) {
    return (
      <EmptyState
        iconName="file-off"
        heading="No packet selected"
        sub="Choose a row in the queue to see its supporting documents."
      />
    );
  }

  return (
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
            {/* 'untracked' (ADR-004) has no status pill of its own —
                it reuses the muted `.na` treatment and says so in
                words, never colour alone. */}
            <span className={`doc-status ${doc.status === 'untracked' ? 'na' : doc.status}`}>
              <Icon name={doc.satisfied ? 'check' : doc.status === 'untracked' ? 'info-circle' : 'clock'} size={12} />
              {doc.status === 'untracked' ? 'not tracked' : doc.status}
            </span>
          </li>
        ))}
      </ul>

      {canWrite && (
        <div className="billing-detail-actions">
          {/* Statement preview (TES-70): enabled only when the compound
              gate is open — the blockers text above already says why
              when it is not (text, not colour, carries the reason). */}
          <button type="button" className="btn primary" disabled={!selectedGenerable} onClick={onPreview}>
            <Icon name="file-invoice" size={14} />
            Preview statement
          </button>
          <button type="button" className="btn secondary">
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
  );
}

export function BillingQueueView({
  packets,
  cards,
  role,
  dataAsOf,
  syncFailed = false,
  stale = false,
}: BillingQueueViewProps) {
  const [query, setQuery] = useState('');
  const [selectedRef, setSelectedRef] = useState<string | null>(packets[0]?.ref ?? null);
  const [preview, setPreview] = useState<BillingCard | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const { summary, filtered, selected, selectedCard, selectedGenerable, firstGenerableCard } =
    useBillingQueueSelection(packets, cards, query, selectedRef);

  const openPreview = (card: BillingCard | null) => {
    if (card?.gate.ready) setPreview(card);
  };

  const handleSave = (label: string) => {
    setPreview(null);
    setToast({
      title: 'Working copy saved',
      message: `${label} recorded to the generation log (append-only). Nothing was submitted to TESDA.`,
    });
  };

  // Viewer is read-only. The server route is the real boundary (RLS + role
  // gate); hiding the controls here is usability, not security.
  const canWrite = role !== 'viewer';

  return (
    <div>
      <BillingQueueHeader
        dataAsOf={dataAsOf}
        stale={stale}
        canWrite={canWrite}
        summary={summary}
        hasCards={Boolean(cards)}
        onGenerate={() => openPreview(selectedGenerable ? selectedCard : firstGenerableCard)}
      />

      <BillingQueueBanners syncFailed={syncFailed} role={role} />

      <BillingSummaryTiles summary={summary} />

      <div className="billing-queue-layout">
        <BillingPacketQueueSection
          packets={packets}
          filtered={filtered}
          query={query}
          onQueryChange={setQuery}
          activeRef={selected?.ref ?? null}
          onSelectRef={setSelectedRef}
        />

        <aside className="surface billing-detail" aria-live="polite">
          <BillingPacketDetailPanel
            selected={selected}
            canWrite={canWrite}
            selectedGenerable={selectedGenerable}
            onPreview={() => openPreview(selectedCard)}
          />
        </aside>
      </div>

      <InfoCallout variant="info">
        <strong>Billing rule:</strong> a packet can be generated only once its supporting
        documents are on file and the scholar count matches the batch record. Generating
        appends a new snapshot — it never overwrites an earlier one, so a corrected
        attendance figure produces a new packet rather than editing history.
      </InfoCallout>

      {preview && (
        <BillingStatementModal
          card={preview}
          initialTrackId={preview.tracks[0].id}
          readOnly={!canWrite}
          onClose={() => setPreview(null)}
          onSave={handleSave}
        />
      )}
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default BillingQueueView;
