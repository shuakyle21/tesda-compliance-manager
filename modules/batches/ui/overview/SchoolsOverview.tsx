/**
 * Admin cross-school overview — the management landing view.
 *
 * Two parts: the urgent exceptions across every school (overdue billing,
 * blocked batches), each labelled with its school and linked to the batch;
 * then one row per school with its own active batches, open items, next
 * billing deadline and required-document readiness, linked to that school's
 * dashboard. Every figure is per school (`schoolSummaries`); nothing is summed
 * across schools into an anonymous total.
 */

import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import { UrgencyIndicator } from '@/shared/ui/UrgencyIndicator';
import { formatDate } from '@/shared/dates';
import { pluralize } from '@/shared/text';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { describeAttention, SEVERITY } from '@/modules/batches/ui/dashboard/NeedsAttentionQueue';
import type { SchoolException, SchoolSummary } from '@/modules/batches/domain/overview';

function exceptionHref({ school, item }: SchoolException): string {
  return 'batchId' in item
    ? scopedPath(school.code, 'table-view', `?batch=${encodeURIComponent(item.batchId)}`)
    : scopedPath(school.code, 'dashboard');
}

function Exceptions({ exceptions }: { exceptions: SchoolException[] }) {
  return (
    <section className="dash-panel attention-queue" aria-labelledby="exceptions-heading">
      <div className="dash-panel-head">
        <h2 id="exceptions-heading" className="dash-panel-title">
          <Icon name="alert-triangle" size={13} /> Urgent across schools
          {exceptions.length > 0 && <span className="attention-count">{exceptions.length}</span>}
        </h2>
      </div>
      {exceptions.length === 0 ? (
        <p className="attention-empty">
          <Icon name="check" size={14} />
          No overdue billing or blocked batches in the recorded data.
        </p>
      ) : (
        <ol className="attention-list">
          {exceptions.map((exception, index) => {
            const { title, detail } = describeAttention(exception.item);
            const severity = SEVERITY[exception.item.severity];
            return (
              <li key={`${exception.school.tenantId}-${index}`}>
                <Link className="attention-item" href={exceptionHref(exception)}>
                  <span className={`attention-icon attention-${exception.item.severity}`}><Icon name={severity.icon} size={14} /></span>
                  <span className="attention-copy">
                    <span className={`attention-severity attention-${exception.item.severity}`}>{severity.word} · {exception.school.name}</span>
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
      <td><NextBilling summary={summary} /></td>
      <td className="overview-num">
        {metrics.docCompliancePct === null
          ? <span className="overview-muted">Not tracked</span>
          : <>{metrics.docCompliancePct}%{metrics.docMissing > 0 && <span className="overview-sub"> · {metrics.docMissing} missing</span>}</>}
      </td>
    </tr>
  );
}

export function SchoolsOverview({ summaries, exceptions }: { summaries: SchoolSummary[]; exceptions: SchoolException[] }) {
  return (
    <div className="dashboard-view">
      <div className="page-head">
        <h1>All schools</h1>
      </div>
      <p className="dash-context">
        <span><strong>{summaries.length}</strong> {pluralize(summaries.length, 'school', 'schools')} you manage</span>
      </p>

      <Exceptions exceptions={exceptions} />

      <section className="dash-panel" aria-labelledby="schools-heading">
        <div className="dash-panel-head">
          <h2 id="schools-heading" className="dash-panel-title"><Icon name="building" size={13} /> Schools</h2>
        </div>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th scope="col">School</th>
                <th scope="col">Active batches</th>
                <th scope="col">Needs attention</th>
                <th scope="col">Next billing due</th>
                <th scope="col">Required documents</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => <SchoolRow key={summary.school.tenantId} summary={summary} />)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
