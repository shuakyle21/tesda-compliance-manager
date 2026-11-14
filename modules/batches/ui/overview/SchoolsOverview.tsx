/**
 * Managed TVI overview — the admin's cross-school landing view.
 *
 * Top to bottom, in the order an administrator asks the questions:
 * filters → KPI row (how many batches, scholars and open items) → the
 * cross-school Needs-attention queue (what to act on today) → one row per
 * school (how each is doing) → stage and document panels → recent activity for
 * a selected school.
 *
 * Per-school figures come from `schoolSummaries`, the same rules the school
 * dashboard uses. A total across schools always states its population
 * ("across N schools"). A panel whose source is not recorded is omitted, not
 * drawn empty (DESIGN.md §18.3).
 */

import Link from 'next/link';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { MetricCard } from '@/shared/ui/MetricCard';
import { UrgencyIndicator } from '@/shared/ui/UrgencyIndicator';
import { formatDate, formatDateTime } from '@/shared/dates';
import { pluralize } from '@/shared/text';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { RecentActivityPanel } from '@/modules/activity/ui/RecentActivityPanel';
import { KpiSummary } from '@/modules/batches/ui/KpiSummary';
import { DocumentStatusDonut } from '@/modules/batches/ui/dashboard/DocumentStatusDonut';
import { describeAttention, SEVERITY } from '@/modules/batches/ui/dashboard/NeedsAttentionQueue';
import {
  hasActiveFilters,
  type OverviewFilterOptions,
  type OverviewFilters as Filters,
  type SchoolException,
  type SchoolSummary,
} from '@/modules/batches/domain/overview';
import { BatchStageDistribution } from './BatchStageDistribution';
import { OverviewFilters } from './OverviewFilters';
import type { ActivityEvent, Batch, DashboardMetrics } from '@/shared/types';

const MAX_QUEUE_ROWS = 8;

function schools(count: number): string {
  return `${count} ${pluralize(count, 'school', 'schools')}`;
}

function queueHref({ school, item }: SchoolException): string {
  return 'batchId' in item
    ? scopedPath(school.code, 'table-view', `?batch=${encodeURIComponent(item.batchId)}`)
    : scopedPath(school.code, 'dashboard');
}

function AttentionQueue({ items }: { items: SchoolException[] }) {
  const shown = items.slice(0, MAX_QUEUE_ROWS);
  const hidden = items.length - shown.length;
  return (
    <section id="needs-attention" className="dash-panel attention-queue" aria-labelledby="attention-heading">
      <div className="dash-panel-head">
        <h2 id="attention-heading" className="dash-panel-title">
          <Icon name="alert-triangle" size={13} /> Needs attention across schools
          {items.length > 0 && <span className="attention-count">{items.length}</span>}
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="attention-empty">
          <Icon name="check" size={14} />
          Nothing open in the recorded deadlines, documents, and batch statuses.
        </p>
      ) : (
        <ol className="attention-list">
          {shown.map((entry, index) => {
            const { title, detail } = describeAttention(entry.item);
            const severity = SEVERITY[entry.item.severity];
            return (
              <li key={`${entry.school.tenantId}-${index}`}>
                <Link className="attention-item" href={queueHref(entry)}>
                  <span className={`attention-icon attention-${entry.item.severity}`}><Icon name={severity.icon} size={14} /></span>
                  <span className="attention-copy">
                    <span className={`attention-severity attention-${entry.item.severity}`}>{severity.word} · {entry.school.name}</span>
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
          {hidden} more {pluralize(hidden, 'item', 'items')} · <a href="#schools" className="dash-link">Review by school</a>
        </p>
      )}
    </section>
  );
}

function NextBilling({ summary }: { summary: SchoolSummary }) {
  const next = summary.metrics.nextBilling;
  if (next) {
    return (
      <span className="overview-cell-stack">
        <span>{formatDate(next.deadline)}</span>
        <UrgencyIndicator days={next.daysToBilling} variant="badge" />
      </span>
    );
  }
  return (
    <span className="overview-muted">
      {summary.metrics.openBillingObligations ? `Not recorded (${summary.metrics.billingDeadlinesMissing})` : 'None open'}
    </span>
  );
}

function SchoolRow({ summary }: { summary: SchoolSummary }) {
  const { school, metrics } = summary;
  const due = summary.attention.length - summary.urgent;
  return (
    <tr>
      <th scope="row">
        <Link href={scopedPath(school.code, 'dashboard')} className="overview-school">
          <span>{school.name}</span>
          <span className="overview-code">{school.code}</span>
        </Link>
      </th>
      <td className="overview-num">{metrics.activeBatches}</td>
      <td className="overview-num">{metrics.activeScholars}</td>
      <td className="overview-num">
        {metrics.sessionProgressPct === null
          ? <span className="overview-muted">Attendance not recorded</span>
          : `${metrics.sessionProgressPct}%`}
      </td>
      <td>
        {summary.attention.length === 0 ? (
          <span className="overview-muted">None</span>
        ) : (
          <span className="overview-cell-stack">
            {summary.urgent > 0 && <span className="attention-urgent"><Icon name="alert-triangle" size={12} /> {summary.urgent} urgent</span>}
            {due > 0 && <span className="attention-due"><Icon name="clock" size={12} /> {due} due</span>}
          </span>
        )}
      </td>
      <td>
        {summary.pastTrainingEnd === 0 ? (
          <span className="overview-muted">None</span>
        ) : (
          <span className="overview-cell-stack">
            <span className="attention-due"><Icon name="alert-circle" size={12} /> {summary.pastTrainingEnd} {pluralize(summary.pastTrainingEnd)}</span>
          </span>
        )}
      </td>
      <td><NextBilling summary={summary} /></td>
      <td className="overview-num">
        {metrics.docCompliancePct === null
          ? <span className="overview-muted">Not tracked</span>
          : <>{metrics.docCompliancePct}%{metrics.docMissing > 0 && <span className="overview-sub"> · {metrics.docMissing} missing</span>}</>}
      </td>
    </tr>
  );
}

function SchoolsTable({ summaries, hiddenSchools }: { summaries: SchoolSummary[]; hiddenSchools: number }) {
  return (
    <section id="schools" className="dash-panel" aria-labelledby="schools-heading">
      <div className="dash-panel-head">
        <h2 id="schools-heading" className="dash-panel-title"><Icon name="building" size={13} /> Schools</h2>
        <div className="dash-panel-meta">{schools(summaries.length)}</div>
      </div>
      <div className="overview-table-wrap" tabIndex={0} role="region" aria-labelledby="schools-heading">
        <table className="overview-table">
          <thead>
            <tr>
              <th scope="col">School</th>
              <th scope="col">Active batches</th>
              <th scope="col">Scholars enrolled</th>
              <th scope="col">Session progress</th>
              <th scope="col">Needs attention</th>
              <th scope="col">Past training end date</th>
              <th scope="col">Next billing due</th>
              <th scope="col">Required documents on file</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => <SchoolRow key={summary.school.tenantId} summary={summary} />)}
          </tbody>
        </table>
      </div>
      {hiddenSchools > 0 && (
        <p className="attention-more">
          {schools(hiddenSchools)} {hiddenSchools === 1 ? 'has' : 'have'} no batches matching these filters.
        </p>
      )}
    </section>
  );
}

export interface SchoolsOverviewProps {
  /** One per school in view (after filters), most urgent first. */
  summaries: SchoolSummary[];
  queue: SchoolException[];
  /** Totals over every batch in view. */
  metrics: DashboardMetrics;
  /** Every batch in view (after filters). */
  batches: Batch[];
  filters: Filters;
  options: OverviewFilterOptions;
  hiddenSchools: number;
  /** ISO time the data was read. */
  fetchedAt: string;
  /** Only when one school is selected: activity events carry no school name. `'failed'` = the read failed. */
  activity?: { events: readonly ActivityEvent[]; href: string } | 'failed';
}

function Activity({ activity }: { activity: NonNullable<SchoolsOverviewProps['activity']> }) {
  if (activity !== 'failed') return <RecentActivityPanel events={activity.events} viewAllHref={activity.href} />;
  return (
    <section className="dash-panel" aria-labelledby="activity-failed-heading">
      <div className="dash-panel-head">
        <h2 id="activity-failed-heading" className="dash-panel-title"><Icon name="timeline" size={13} /> Recent activity</h2>
      </div>
      <p className="attention-more" role="status">
        <span className="attention-due"><Icon name="alert-circle" size={14} /></span>
        Recent activity for this school could not be loaded. Reload the page to try again.
      </p>
    </section>
  );
}

export function SchoolsOverview({ summaries, queue, metrics, batches, filters, options, hiddenSchools, fetchedAt, activity }: SchoolsOverviewProps) {
  const managed = options.schools.length;
  const filtered = hasActiveFilters(filters);
  const population = `across ${schools(summaries.length)}`;
  const withActive = summaries.filter((summary) => summary.metrics.activeBatches > 0).length;
  const leadSub = filtered ? `${summaries.length} in view with these filters` : `${withActive} with active batches`;
  const active = batches.filter((batch) => batch.status === 'ongoing');
  // A school with no batches is not a failed search: only a program or
  // qualification filter can "match nothing".
  const noMatches = batches.length === 0 && (filters.program !== null || filters.qualification !== null);

  return (
    <div className="dashboard-view">
      <div className="page-head">
        <h1>Managed TVI overview</h1>
      </div>
      <p className="dash-context">
        <span><strong>{managed}</strong> {pluralize(managed, 'school', 'schools')} you manage</span>
        <span className="dash-context-stamp">Data as of {formatDateTime(fetchedAt)}</span>
      </p>

      <OverviewFilters filters={filters} options={options} />

      {noMatches ? (
        <EmptyState iconName="search-off" heading="No batches match these filters"
          sub="Change or clear the filters to see your schools."
          action={<Link href="/overview" className="btn primary" style={{ marginTop: 12 }}>Clear filters</Link>} />
      ) : batches.length === 0 ? (
        <>
          <EmptyState iconName="folders" heading="No batches yet"
            sub="Batches appear here once a school coordinator imports or assigns them." />
          <SchoolsTable summaries={summaries} hiddenSchools={0} />
        </>
      ) : (
        <>
          <KpiSummary
            metrics={metrics}
            links={{ batches: '#schools', attention: '#needs-attention', documents: '#documents' }}
            attention={{ total: queue.length, urgent: queue.filter((entry) => entry.item.severity === 'urgent').length }}
            // Billing is per school in the table: batch codes are not unique across schools.
            hideBilling
            population={population}
            lead={
              <MetricCard label="Managed schools" value={managed} sub={leadSub} iconName="building" href="#schools"
                ariaLabel={`Managed schools: ${managed}. ${leadSub}.`} />
            }
          />

          <AttentionQueue items={queue} />
          <SchoolsTable summaries={summaries} hiddenSchools={hiddenSchools} />

          <div id="documents" className="dash-pair">
            <BatchStageDistribution batches={batches} />
            <DocumentStatusDonut batches={active} />
          </div>
        </>
      )}

      {activity && !noMatches && <Activity activity={activity} />}
    </div>
  );
}
