/**
 * Cross-school overview (admin landing) — pure domain logic, no I/O.
 *
 * The one place batches from several schools are read together, and it never
 * sums them into one anonymous figure: every number is grouped by school,
 * computed with the same `deriveDashboardMetrics` / `attentionItems` rules the
 * school dashboard uses, so the overview and a school's own dashboard cannot
 * disagree about that school.
 */

import { attentionItems, type AttentionItem } from './attention';
import { deriveDashboardMetrics } from './metrics';
import type { Batch, DashboardMetrics } from '@/shared/types';

export interface SchoolRef {
  tenantId: string;
  code: string;
  name: string;
}

export interface SchoolSummary {
  school: SchoolRef;
  metrics: DashboardMetrics;
  attention: AttentionItem[];
  urgent: number;
}

export interface SchoolException {
  school: SchoolRef;
  item: AttentionItem;
}

/** One summary per school the caller belongs to — schools with no batches included, so none silently drops out. */
export function schoolSummaries(batches: readonly Batch[], schools: readonly SchoolRef[]): SchoolSummary[] {
  return schools
    .map((school) => {
      const own = batches.filter((b) => b.tenantId === school.tenantId);
      const attention = attentionItems(own, { syncFailed: false });
      return {
        school,
        metrics: deriveDashboardMetrics(own),
        attention,
        urgent: attention.filter((item) => item.severity === 'urgent').length,
      };
    })
    // Most urgent school first, then most open items, then name for a stable order.
    .sort((a, b) => b.urgent - a.urgent || b.attention.length - a.attention.length || a.school.name.localeCompare(b.school.name));
}

/** Every school's urgent items, labelled with their school — the cross-school exception list. */
export function crossSchoolExceptions(summaries: readonly SchoolSummary[]): SchoolException[] {
  return summaries.flatMap((summary) =>
    summary.attention
      .filter((item) => item.severity === 'urgent')
      .map((item) => ({ school: summary.school, item })),
  );
}
