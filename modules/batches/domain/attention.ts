/**
 * Needs-attention queue (FR-05) — pure domain logic, no I/O.
 *
 * The dashboard's signature element: one ordered list of verified, actionable
 * work. Every item traces to a recorded fact — an open billing obligation with
 * a recorded deadline, a required document recorded as missing, a batch
 * recorded as blocked, a failed sync. Nothing is inferred from absent data:
 * an untracked document is not "missing" (ADR-004), and a missing deadline is
 * surfaced as the data gap it is, never counted down.
 *
 * Severity follows the dashboard's color contract: `urgent` (red) is work that
 * is overdue or blocked; `due` (amber) is work that comes due or needs a
 * record. Readiness (green) never enters the queue — it is not a task.
 *
 * Items carry structured facts (ISO dates, counts, document names) and no
 * display copy; the UI formats them.
 */

import { criticalRequirements, docRecordFor } from '@/modules/documents/domain/compliance';
import { hasOpenBillingObligation, hasRecordedBillingDeadline, urgencyTier } from './urgency';
import type { Batch } from '@/shared/types';

/** Deadlines inside this window enter the queue (the warning tier's outer edge). */
export const BILLING_DUE_WINDOW_DAYS = 21;

export type AttentionSeverity = 'urgent' | 'due';

export type AttentionItem =
  | { kind: 'sync-failed'; severity: 'urgent' }
  | { kind: 'blocked'; severity: 'urgent'; batchId: string }
  | { kind: 'billing-overdue'; severity: 'urgent'; batchId: string; deadline: string; daysOverdue: number }
  | { kind: 'billing-due'; severity: 'due'; batchId: string; deadline: string; daysLeft: number }
  | { kind: 'documents-missing'; severity: 'due'; batchId: string; documents: string[] }
  | { kind: 'billing-deadline-missing'; severity: 'due'; batchIds: string[] };

const SEVERITY_RANK: Record<AttentionSeverity, number> = { urgent: 0, due: 1 };

function billingItem(batch: Batch): AttentionItem | null {
  if (!hasOpenBillingObligation(batch) || !hasRecordedBillingDeadline(batch) || !batch.billingDeadline) return null;
  if (urgencyTier(batch.daysToBilling) === 'overdue') {
    return { kind: 'billing-overdue', severity: 'urgent', batchId: batch.id, deadline: batch.billingDeadline, daysOverdue: -batch.daysToBilling };
  }
  if (batch.daysToBilling <= BILLING_DUE_WINDOW_DAYS) {
    return { kind: 'billing-due', severity: 'due', batchId: batch.id, deadline: batch.billingDeadline, daysLeft: batch.daysToBilling };
  }
  return null;
}

/** Required documents recorded as `missing` — never untracked ones (ADR-004 measurement rule). */
function missingDocumentsItem(batch: Batch): AttentionItem | null {
  const documents = criticalRequirements(batch.documentRequirements)
    .filter((req) => docRecordFor(batch, req.key)?.status === 'missing')
    .map((req) => req.label);
  return documents.length ? { kind: 'documents-missing', severity: 'due', batchId: batch.id, documents } : null;
}

/**
 * Sort key inside one severity: the more overdue / sooner due, the earlier.
 * A sync failure leads everything — it means every other item may be missing.
 */
function urgencyOrder(item: AttentionItem): number {
  if (item.kind === 'sync-failed') return Number.NEGATIVE_INFINITY;
  if (item.kind === 'billing-overdue') return -item.daysOverdue;
  if (item.kind === 'billing-due') return item.daysLeft;
  return Number.POSITIVE_INFINITY;
}

export function attentionItems(batches: readonly Batch[], options: { syncFailed: boolean }): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (options.syncFailed) items.push({ kind: 'sync-failed', severity: 'urgent' });

  for (const batch of batches) {
    if (batch.blocked) items.push({ kind: 'blocked', severity: 'urgent', batchId: batch.id });
    const billing = billingItem(batch);
    if (billing) items.push(billing);
    const documents = missingDocumentsItem(batch);
    if (documents) items.push(documents);
  }

  // One aggregate row, not one per batch: a missing deadline is a data gap to
  // fill, and N identical rows would bury the real deadlines beneath it.
  const undated = batches
    .filter((b) => hasOpenBillingObligation(b) && !hasRecordedBillingDeadline(b))
    .map((b) => b.id);
  if (undated.length) items.push({ kind: 'billing-deadline-missing', severity: 'due', batchIds: undated });

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) =>
      SEVERITY_RANK[a.item.severity] - SEVERITY_RANK[b.item.severity]
      || urgencyOrder(a.item) - urgencyOrder(b.item)
      || a.index - b.index)
    .map(({ item }) => item);
}
