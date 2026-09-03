/**
 * Billing packets (FR-09) — pure domain logic, no I/O.
 *
 * ADR-003 P1: a "packet" is a PROJECTION over `(batch_id, billing_type,
 * tranche_no)` — the same key ADR-001 §4.1/§4.2 already tranches on. It is not a
 * stored invoice and carries no ledger. Everything in this file is derived from
 * a batch plus its documents, which is why the whole module is a pure function
 * of its inputs and can be unit-tested with a fixed as-of date.
 *
 * ADR-003 P5: `dueDate` and "overdue" are computed on read, never stored, so the
 * screen inherits the existing "Data as of" stamp instead of drifting.
 */

import { docRecordFor, isDocOnFile } from '@/modules/documents/domain/compliance';
import type { Batch, DocRecord, DocStatus, DocumentRequirement } from '@/shared/types';

/** ₱/day TSF rate — TESDA Circular 015 s.2026, recorded in ADR-001 §3. */
export const TSF_DAY_RATE = 160;

/**
 * Lifecycle stages whose documents must be settled before a packet can be
 * generated. Deliberately excludes `assess`/`bill` stage documents: those are
 * produced *by* billing, so requiring them would make readiness circular and
 * leave Generate permanently dead (the same gate scoping TES-70 landed on).
 */
export const PRE_BILLING_STAGES = ['aou', 'ntp', 'tip', 'train'] as const;

/** Progress threshold at which the final TSF tranche unlocks (ADR-001 §4.1). */
export const PACKET_READY_THRESHOLD = 80;

export type PacketState = 'draft' | 'ready' | 'generated' | 'submitted' | 'settled';

export interface PacketDoc {
  key: string;
  label: string;
  /**
   * `'untracked'` (ADR-004) when the batch has no record for this requirement
   * at all — reported as its own state rather than flattened into `'missing'`,
   * which would assert a document is absent when nothing was ever recorded.
   * It is never `satisfied`: gates stay closed on unrecorded evidence.
   */
  status: DocStatus | 'untracked';
  /** A doc counts as satisfied once uploaded — ADR-001 §7.2.4 accepts the
   *  manual attendance sheet as evidence, so `submitted` is not a blocker. */
  satisfied: boolean;
}

export interface BillingPacket {
  /** Display-only reference (ADR-003 P1) — NOT an accounting document number. */
  ref: string;
  batchId: string;
  batchName: string;
  qualification: string;
  program: string;
  schoolCode: string;
  scholars: number;
  /** TSF/Allowance component in centavos-free pesos (see {@link tsfAmount}). */
  amount: number;
  state: PacketState;
  /** Derived (P5). Negative = past due. */
  daysToDue: number;
  dueLabel: string;
  docs: PacketDoc[];
  /** Human-readable reasons the packet is not yet generatable. */
  blockers: string[];
}

/**
 * TSF / Allowance total for a batch: `training days × ₱160 × scholars`
 * (ADR-001 §3). The Training Cost component is deliberately NOT summed here —
 * it needs the per-qualification cost-schedule snapshot (BB1) which is not yet
 * on the `Batch` contract. Surfacing a partial, labelled figure is honest;
 * inventing a rate would not be.
 */
export function tsfAmount(batch: Batch): number {
  return batch.totalDays * TSF_DAY_RATE * batch.scholars;
}

/**
 * Formats a peso amount with thousands separators (e.g., "₱184,000").
 * Used by both the summary tiles and the queue rows.
 */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}

/**
 * Formats a peso amount in compact notation for summary tiles.
 * Amounts >= 1M show as "₱1.2M", >= 1K show as "₱184K", otherwise full amount.
 */
export function formatPesoCompact(amount: number): string {
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₱${Math.round(amount / 1_000)}K`;
  return `₱${amount}`;
}

/**
 * Derives a human-readable due label from the days-to-due count.
 * Negative values show as "Nd past due", zero as "Due today", etc.
 */
function dueLabelFor(daysToDue: number): string {
  if (daysToDue < 0) return `${Math.abs(daysToDue)}d past due`;
  if (daysToDue === 0) return 'Due today';
  if (daysToDue === 1) return 'Due tomorrow';
  return `Due in ${daysToDue}d`;
}

/**
 * Build the packet projection for one batch.
 *
 * `state` is derived rather than read, because ADR-003 P2/P3 puts `generated` in
 * `billing_records` (table not yet migrated) and makes `submitted`/`settled`
 * user-asserted marks with no store yet. Completed batches therefore stand in
 * as `settled` — a prototype portrayal of the target, per ADR-002.
 *
 * @param batch - The batch to build a packet for
 * @param requirements - The document requirement catalog
 * @param schoolCode - The school code for display
 * @param sequence - The packet sequence number for generating the ref
 * @returns Complete billing packet projection
 */
export function buildPacket(
  batch: Batch,
  requirements: DocumentRequirement[],
  schoolCode: string,
  sequence: number,
): BillingPacket {
  const docs: PacketDoc[] = requirements
    .filter((r) => (PRE_BILLING_STAGES as readonly string[]).includes(r.stage))
    .map((r) => {
      const record: DocRecord | null = docRecordFor(batch, r.key);
      const status: DocStatus | 'untracked' = record?.status ?? 'untracked';
      return {
        key: r.key,
        label: r.label,
        status,
        satisfied: isDocOnFile(batch, r.key),
      };
    });

  const unsatisfied = docs.filter((d) => !d.satisfied);
  const belowThreshold = batch.progressPct < PACKET_READY_THRESHOLD;
  // An empty catalog means the requirement list couldn't be loaded, not that
  // nothing is required — an unevaluated checklist must never read as
  // satisfied (mirrors billingGate's `requiredTotal > 0` guard).
  const requirementsUnavailable = requirements.length === 0;

  const blockers: string[] = [];
  if (belowThreshold) {
    blockers.push(
      `Training progress is ${batch.progressPct}% — the final tranche unlocks at ${PACKET_READY_THRESHOLD}%.`,
    );
  }
  if (requirementsUnavailable) {
    blockers.push('Document requirement catalog unavailable — supporting documents could not be verified.');
  } else if (unsatisfied.length > 0) {
    blockers.push(
      `${unsatisfied.length} supporting ${unsatisfied.length === 1 ? 'document is' : 'documents are'} not yet on file: ${unsatisfied
        .map((d) => d.label)
        .join(', ')}.`,
    );
  }

  const state: PacketState =
    batch.status === 'completed' ? 'settled' : blockers.length === 0 ? 'ready' : 'draft';

  return {
    ref: `PKT-${String(sequence).padStart(3, '0')}`,
    batchId: batch.id,
    batchName: batch.name.replace(/ · Batch \d+$/, ''),
    qualification: batch.qualification,
    program: batch.program,
    schoolCode,
    scholars: batch.scholars,
    amount: tsfAmount(batch),
    state,
    daysToDue: batch.daysToBilling,
    dueLabel: batch.status === 'completed' ? 'Settled' : dueLabelFor(batch.daysToBilling),
    docs,
    blockers,
  };
}

/**
 * Returns true when a live packet has passed its derived due date (ADR-003 P5).
 * Settled packets are never overdue regardless of their due date.
 */
export function isOverdue(packet: BillingPacket): boolean {
  return packet.state !== 'settled' && packet.daysToDue < 0;
}

/**
 * Builds billing packets for a set of batches. Each batch produces one packet,
 * numbered sequentially. The school code for each tenant is resolved from the
 * provided `schoolCodes` map, falling back to "—" when not found.
 */
export function buildPackets(
  batches: Batch[],
  requirements: DocumentRequirement[],
  schoolCodes: Record<string, string>,
): BillingPacket[] {
  return batches.map((batch, i) =>
    buildPacket(batch, requirements, schoolCodes[batch.tenantId] ?? '—', i + 1),
  );
}

export interface PacketSummary {
  ready: number;
  readyCount: number;
  pendingReview: number;
  pendingCount: number;
  overdue: number;
  overdueCount: number;
  settled: number;
  settledCount: number;
}

/**
 * Summarize packets into the four billing queue tiles.
 *
 * Computes ready, pending, overdue, and settled totals with counts. Every
 * figure is a sum over the projection, not a stored aggregate — and `settled`
 * is an *observation* total (what someone marked), never a reconciliation
 * (ADR-003 P6).
 *
 * @param packets - The packets to summarize
 * @returns Summary with amounts and counts for each state
 */
export function summarizePackets(packets: BillingPacket[]): PacketSummary {
  const sum = (list: BillingPacket[]) => list.reduce((total, p) => total + p.amount, 0);

  const ready = packets.filter((p) => p.state === 'ready' && !isOverdue(p));
  const pending = packets.filter((p) => p.state === 'draft' && !isOverdue(p));
  const overdue = packets.filter(isOverdue);
  const settled = packets.filter((p) => p.state === 'settled');

  return {
    ready: sum(ready),
    readyCount: ready.length,
    pendingReview: sum(pending),
    pendingCount: pending.length,
    overdue: sum(overdue),
    overdueCount: overdue.length,
    settled: sum(settled),
    settledCount: settled.length,
  };
}

/**
 * Filter packets by free-text search query.
 *
 * Searches across ref, batch name, qualification, school code, and program
 * (case-insensitive) — the fields the queue's search box advertises.
 *
 * @param packets - The packets to filter
 * @param query - The search query
 * @returns Filtered packets matching the query
 */
export function filterPackets(packets: BillingPacket[], query: string): BillingPacket[] {
  const q = query.trim().toLowerCase();
  if (!q) return packets;
  return packets.filter((p) =>
    [p.ref, p.batchName, p.qualification, p.schoolCode, p.program]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}
