/**
 * Needs attention — the dashboard's signature element.
 *
 * Renders `attentionItems()` (modules/batches/domain/attention.ts): one ordered
 * list of verified, actionable work. Severity reads as a word and an icon,
 * never color alone (RULES.md rule 23); every batch item links to that batch.
 *
 * The empty copy claims only what was checked. "No blockers" over checks that
 * have no data to run on would be a false all-clear on a compliance surface.
 */

import Link from 'next/link';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { formatDate } from '@/shared/dates';
import { pluralize } from '@/shared/text';
import type { AttentionItem, AttentionSeverity } from '@/modules/batches/domain/attention';

export const SEVERITY: Record<AttentionSeverity, { icon: IconName; word: string }> = {
  urgent: { icon: 'alert-triangle', word: 'Urgent' },
  due: { icon: 'clock', word: 'Due' },
};

const MAX_ROWS = 8;

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/** Headline + one detail line per item, from structured facts only. Shared with the admin overview. */
export function describeAttention(item: AttentionItem): { title: string; detail: string } {
  switch (item.kind) {
    case 'sync-failed':
      return { title: 'Batch data could not be loaded', detail: 'Figures on this page may be incomplete. Reload to try again.' };
    case 'blocked':
      return { title: `${item.batchId} is blocked`, detail: 'Recorded as blocked. Resolve the blocker to move the batch forward.' };
    case 'billing-overdue':
      return { title: `${item.batchId} billing overdue`, detail: `Was due ${formatDate(item.deadline) ?? 'on a recorded date'} · ${days(item.daysOverdue)} overdue` };
    case 'billing-due':
      return {
        title: `${item.batchId} billing due`,
        detail: `Due ${formatDate(item.deadline) ?? 'on a recorded date'} · ${item.daysLeft === 0 ? 'today' : `${days(item.daysLeft)} left`}`,
      };
    case 'documents-missing':
      return {
        title: `${item.batchId} missing ${item.documents.length} required ${pluralize(item.documents.length, 'document', 'documents')}`,
        detail: item.documents.join(' · '),
      };
    case 'billing-deadline-missing':
      return {
        title: `Billing deadline not recorded for ${item.batchIds.length} ${pluralize(item.batchIds.length)}`,
        detail: item.batchIds.join(' · '),
      };
  }
}

function hrefFor(item: AttentionItem, links: AttentionLinks): string {
  switch (item.kind) {
    case 'sync-failed':
      return links.retry;
    case 'billing-deadline-missing':
      return links.batches;
    default:
      return links.batch(item.batchId);
  }
}

export interface AttentionLinks {
  batches: string;
  retry: string;
  batch: (batchId: string) => string;
}

export function NeedsAttentionQueue({ items, links }: { items: AttentionItem[]; links: AttentionLinks }) {
  const shown = items.slice(0, MAX_ROWS);
  const hidden = items.length - shown.length;

  return (
    <section id="needs-attention" className="dash-panel attention-queue" aria-labelledby="attention-heading">
      <div className="dash-panel-head">
        <h2 id="attention-heading" className="dash-panel-title">
          <Icon name="alert-triangle" size={13} /> Needs attention
          {items.length > 0 && <span className="attention-count">{items.length}</span>}
        </h2>
        <Link href={links.batches} className="dash-link">All batches</Link>
      </div>
      {items.length === 0 ? (
        <p className="attention-empty">
          <Icon name="check" size={14} />
          Nothing open in the recorded deadlines, documents, and batch statuses.
        </p>
      ) : (
        <ol className="attention-list">
          {shown.map((item, index) => {
            const severity = SEVERITY[item.severity];
            const { title, detail } = describeAttention(item);
            return (
              <li key={`${item.kind}-${'batchId' in item ? item.batchId : index}`}>
                <Link className="attention-item" href={hrefFor(item, links)}>
                  <span className={`attention-icon attention-${item.severity}`}>
                    <Icon name={severity.icon} size={14} />
                  </span>
                  <span className="attention-copy">
                    <span className={`attention-severity attention-${item.severity}`}>{severity.word}</span>
                    <span className="attention-title">{title}</span>
                    <span className="attention-detail">{detail}</span>
                  </span>
                  <Icon name="chevron-right" size={15} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {hidden > 0 && (
        <p className="attention-more">
          {hidden} more {pluralize(hidden, 'item', 'items')} · <Link href={links.batches} className="dash-link">Review all batches</Link>
        </p>
      )}
    </section>
  );
}
