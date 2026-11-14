/**
 * UI COMPONENT — SnapshotStatusNotice
 *
 * Renders the notice from `snapshotNotice()`. Pass the post-fold status: the
 * route folds `withTenantAccess` first. Renders nothing when the page has rows
 * and no failure, so the page's own content shows.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { InfoCallout } from './InfoCallout';
import { NoTenantAccessState } from './NoTenantAccessState';
import { snapshotNotice, type SnapshotStatus } from './snapshotNotice';

interface SnapshotStatusNoticeProps {
  status: SnapshotStatus;
  hasRows: boolean;
  /** Lowercase, for NoTenantAccessState, e.g. "the activity log". */
  subject: string;
  retryHref: string;
  /** The page's ordinary empty copy; shown only for an ok snapshot with no rows. */
  emptyFallback: ReactNode;
}

export function SnapshotStatusNotice({ status, hasRows, subject, retryHref, emptyFallback }: SnapshotStatusNoticeProps) {
  const retry = <Link href={retryHref} className="btn primary" style={{ marginTop: 12 }}>Retry</Link>;
  switch (snapshotNotice(status, hasRows)) {
    case 'no-access':
      return <NoTenantAccessState subject={subject} />;
    case 'unconfigured':
      return <EmptyState iconName="database" heading="Data source not connected" sub="Batch data isn't connected in this environment." />;
    case 'failed':
      return <EmptyState iconName="refresh" heading="Data couldn't be loaded" sub="Try again in a moment." action={retry} />;
    case 'failed-banner':
      return (
        <InfoCallout variant="warning">
          Data couldn&apos;t be loaded — this may be incomplete.
          <Link href={retryHref} className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
        </InfoCallout>
      );
    case 'empty':
      return <>{emptyFallback}</>;
    case 'none':
      return null;
  }
}
