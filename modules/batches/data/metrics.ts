/**
 * Dashboard metrics contract (TES-30) — the real, non-mock home for the 5-card
 * dashboard summary computation. `shared/mocks/index.ts`'s `getMockMetrics`
 * keeps its own copy for the mock-fallback path (`shared/` cannot import
 * `modules/`, per the import-direction rule); this is the "real" counterpart
 * the sibling-contracts scope item asked for.
 *
 * Derive-only: no I/O, pure function over whatever `Batch[]` the caller
 * already loaded (live or mock) — mirrors `modules/batches/domain/urgency.ts`'s
 * shape more than `batches.ts`'s fetch/map layers, but lives at this path per
 * the TES-30 issue text.
 *
 * Deliberately takes `criticalDocumentKeys` as a parameter instead of
 * importing a requirement catalog: the mock `DOCUMENT_REQUIREMENTS` (12 keys,
 * `shared/mocks/seed.ts`) and the live `program_document_requirements` table
 * use different key sets (see `modules/documents/data/documents.ts`'s note on
 * `training_sched` vs `training_schedule`, `billing_rpt` vs `billing_report`).
 * Hardcoding either catalog here would silently make this function correct for
 * only one of the two batch sources it needs to serve.
 *
 * Billing-deadline caveat: `earliestBillingDeadline` / `daysToEarliestBilling`
 * read `Batch.billingDeadline` / `daysToBilling`, which `batches.ts` currently
 * stands in with `end_date` (its own `TODO(contract)` — no `billing_deadline`
 * column exists yet). This function inherits that stand-in; it is not a bug
 * introduced here.
 *
 * Trainer-facing routes must omit billing/financial/NTP-lag/BSRS fields
 * server-side (CLAUDE.md "Role rules"; see commit 85534b5's omission of a
 * different metric for the same reason). `DashboardMetrics` carries the
 * billing-deadline fields above, so a trainer-scoped caller must strip them
 * from this return value before it reaches a trainer route — this function
 * does not know its caller's role and does not do that stripping itself.
 */

import type { Batch, DashboardMetrics } from '@/shared/types';

/**
 * Derive the 5-card dashboard metrics from a batch set. Numbers are always
 * computed from `batches`, never hardcoded, so they can't drift from the
 * underlying records — same guarantee `getMockMetrics` documents.
 */
export function getDashboardMetrics(
  batches: Batch[],
  criticalDocumentKeys: string[],
): DashboardMetrics {
  const totalBatches = batches.length;
  const totalScholars = batches.reduce((s, b) => s + b.scholars, 0);
  const avgProgress = totalBatches
    ? Math.round(batches.reduce((s, b) => s + b.progressPct, 0) / totalBatches)
    : 0;
  const activeBatches = batches.filter((b) => b.status === 'ongoing').length;

  const earliest = totalBatches
    ? batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0]
    : null;

  // Critical-document compliance summary.
  let missing = 0;
  let pending = 0;
  batches.forEach((b) => {
    criticalDocumentKeys.forEach((key) => {
      const st = b.documents[key]?.status;
      if (st === 'missing') missing++;
      if (st === 'pending') pending++;
    });
  });
  const critTotal = criticalDocumentKeys.length * totalBatches;
  const verified = critTotal - missing - pending;
  const docCompliancePct = critTotal ? Math.round((verified / critTotal) * 100) : 0;

  return {
    totalBatches,
    totalScholars,
    avgProgress,
    earliestBillingDeadline: earliest ? earliest.billingDeadline.replace(/, \d+$/, '') : '—',
    daysToEarliestBilling: earliest ? earliest.daysToBilling : 0,
    activeBatches,
    docCompliancePct,
    docMissing: missing,
    docPending: pending,
  };
}
