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

import { Icon } from '@/shared/ui/Icon';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { useBatchLearners } from '@/modules/batches/data/useBatchLearners';
import type { ScholarRow } from '@/shared/types';

function fullName(scholar: ScholarRow): string {
  return [scholar.lastName + ',', scholar.firstName, scholar.middleInit, scholar.extName]
    .filter(Boolean)
    .join(' ');
}

function RosterBody({ batchId }: { batchId: string }) {
  const { data, isPending, isError } = useBatchLearners(batchId);

  if (isPending) {
    return (
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading roster…</div>
    );
  }

  // `sync-failed` is the only arm that throws, and the message is ours, never
  // the database's — see `shared/snapshotQuery.ts`.
  if (isError) {
    return (
      <InfoCallout variant="warning">
        Sync with Supabase failed — this batch&apos;s roster could not be loaded.
      </InfoCallout>
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
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
      {data.learners.map((scholar) => (
        <li
          key={`${scholar.seq}-${scholar.uli || scholar.lastName}`}
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
              <Icon
                name={scholar.assessmentResult === 'Competent' ? 'check' : 'clock'}
                size={13}
              />
              {scholar.assessmentResult}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BatchRosterSection({ batchId }: { batchId: string }) {
  return (
    <div className="nm-section">
      <div className="nm-section-title">
        <Icon name="users" size={13} />
        Scholars
      </div>
      <RosterBody batchId={batchId} />
    </div>
  );
}
