'use client';

/**
 * The scholar roster for one batch, loaded on demand when the batch modal opens.
 *
 * Drill-in data by nature: `getBatchesSnapshot` deliberately does not join
 * `learners`, because pulling every batch's roster to render a list of batch
 * cards would be waste. `Batch.scholars` carries the count; the names live
 * here, one batch at a time, cached so reopening the same batch is free.
 *
 * Assessment result is shown as text plus icon rather than colour alone — a
 * misread compliance status is an operational failure, not a cosmetic one.
 */

import { Icon, type IconName } from '@/shared/ui/Icon';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { useBatchLearners } from '@/modules/batches/data/useBatchLearners';
import type { LearnersSnapshot } from '@/modules/batches/data/learners';
import type { ScholarRow } from '@/shared/types';

function fullName(scholar: ScholarRow): string {
  return [scholar.lastName + ',', scholar.firstName, scholar.middleInit, scholar.extName]
    .filter(Boolean)
    .join(' ');
}

/**
 * The roster's six states. Kept in one component rather than split behind a
 * wrapper so a unit test can call it directly and assert which state renders —
 * the `no-tenant-access` vs. empty distinction in particular is mandated, not
 * cosmetic, and worth pinning.
 */
export function BatchRosterSection({ batchId }: { batchId: string }) {
  const { data, isPending, isError } = useBatchLearners(batchId);

  return (
    <div className="nm-section">
      {/* Deliberately not "Scholars": `BatchScholarsGrid` directly above already
          uses that title and the same icon for the enrolment counts. Two
          identical headings in a row read as a rendering fault. */}
      <div className="nm-section-title">
        <Icon name="file-text" size={13} />
        Scholar roster
      </div>
      {rosterBody({ data, isPending, isError })}
    </div>
  );
}

/** The snapshot arms that can reach the UI — `sync-failed` throws instead. */
type ResolvedRoster = Exclude<LearnersSnapshot, { status: 'sync-failed' }>;

export function rosterBody({
  data,
  isPending,
  isError,
}: {
  data: ResolvedRoster | undefined;
  isPending: boolean;
  isError: boolean;
}) {
  // A failed *refresh* still holds the rows from the last good fetch — TanStack
  // keeps `data` populated across an error. Those rows are the best available
  // answer, so they stay on screen with the refresh failure stated above them.
  // Replacing a roster someone is reading with an error panel would lose real
  // information to report a transient one.
  const refreshFailed = isError && data !== undefined;

  // Order matters below: on a *first* load failure `data` is undefined too, so
  // an absence check ahead of the error check would leave this "loading" for
  // good.
  if (isError && !data) {
    return (
      <InfoCallout variant="warning">
        Sync with Supabase failed — this batch&apos;s roster could not be loaded.
      </InfoCallout>
    );
  }

  if (isPending || !data) {
    return (
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading roster…</div>
    );
  }

  if (data.status === 'unconfigured') {
    return (
      <EmptyState
        iconName="file-off"
        heading="Roster unavailable"
        sub="This workspace isn't connected to its data source yet, so scholar names can't be shown."
      />
    );
  }

  // Unreachable from the modal — every route folds tenant access server-side
  // before rendering the list this modal opens from. Handled so a future
  // URL-addressed drill-in gets the mandated screen, not a blank list.
  if (data.status === 'no-tenant-access') {
    return <NoTenantAccessState subject="this roster" />;
  }

  if (data.learners.length === 0) {
    return (
      <EmptyState
        iconName="users"
        heading="No scholars enrolled"
        sub="Once learners are imported for this batch, their names and assessment results appear here."
      />
    );
  }

  return (
    <>
      {refreshFailed && (
        <InfoCallout variant="warning">
          Couldn&apos;t refresh this roster — the names below are from the last
          successful sync and may be out of date.
        </InfoCallout>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
        {data.learners.map((scholar) => (
        <li
          key={scholar.seq}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 0',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 13,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              minWidth: 22,
            }}
          >
            {scholar.seq}
          </span>
          <span style={{ color: 'var(--color-text-primary)' }}>{fullName(scholar)}</span>
          {scholar.uli && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-text-muted)',
              }}
            >
              {scholar.uli}
            </span>
          )}
          {scholar.assessmentResult && (
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              <Icon name={assessmentIcon(scholar.assessmentResult)} size={13} />
              {scholar.assessmentResult}
            </span>
          )}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * "Not Yet Competent" is an assessed outcome, not work in progress, so it must
 * not borrow the clock. A scholar who has not been assessed at all maps to an
 * empty string upstream and renders no status here rather than a guess.
 */
function assessmentIcon(result: string): IconName {
  return result === 'Competent' ? 'check' : 'alert-triangle';
}

