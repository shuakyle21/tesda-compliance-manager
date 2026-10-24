/**
 * Dashboard banner callout — the sync-failure retry banner.
 *
 * RULES.md rule 19: a `sync-failed` snapshot must surface the banner — it may
 * never read as an ordinary empty tenant. The route decides *whether* it
 * renders; this file only decides how it looks.
 *
 * The critical-documents banner that used to live here is gone: missing
 * required documents are now named per batch in the Needs-attention queue,
 * and a second, vaguer copy of the same fact above it was noise.
 */

import Link from 'next/link';
import { InfoCallout } from '@/shared/ui/InfoCallout';

interface SyncFailedCalloutProps {
  syncFailed: boolean;
  /**
   * True only when the rows on screen did not come from a live read.
   * `syncFailed` can be true via the `?state=` preview override while the
   * snapshot is still `ok` and showing live rows — claiming otherwise would be
   * a lie about data provenance.
   */
  isShowingCachedFallback: boolean;
  retryHref: string;
}

export function DashboardCallouts({ syncFailed, isShowingCachedFallback, retryHref }: SyncFailedCalloutProps) {
  if (!syncFailed) return null;

  return (
    <div role="status">
      <InfoCallout variant="warning">
        Batch data couldn&apos;t be loaded{isShowingCachedFallback ? '' : ' — the figures below may be out of date'}.
        <Link href={retryHref} className="dash-link" style={{ marginLeft: 8 }}>Try again</Link>
      </InfoCallout>
    </div>
  );
}
