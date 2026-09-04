/**
 * Dashboard banner callouts — the sync-failure retry banner and the
 * critical-document audit prompt.
 *
 * Both components previously existed at the bottom of
 * `app/(dashboard)/dashboard/page.tsx` but were never rendered: the route
 * inlined its own copies, which then diverged (the inline sync banner grew an
 * `isShowingCachedFallback` distinction the dead component never got). This
 * module is the single surviving definition, with that distinction kept.
 *
 * RULES.md rule 19: a `sync-failed` snapshot must surface the banner — it may
 * never read as an ordinary empty tenant. The route still decides *whether*
 * these render; this file only decides how they look.
 */

import Link from 'next/link';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { Icon } from '@/shared/ui/Icon';
import { pluralize } from '@/shared/text';

interface SyncFailedCalloutProps {
  syncFailed: boolean;
  /**
   * True only when the rows on screen actually came from the cached/mock
   * fallback. `syncFailed` can be true via the `?state=` preview override
   * while the snapshot is still `ok` and showing live rows — claiming
   * "cached" there would be a lie about data provenance.
   */
  isShowingCachedFallback: boolean;
  message: string;
}

export function SyncFailedCallout({ syncFailed, isShowingCachedFallback, message }: SyncFailedCalloutProps) {
  if (!syncFailed) return null;

  return (
    <InfoCallout variant="warning">
      Sync with Supabase failed — showing{' '}
      {isShowingCachedFallback ? `the last cached snapshot${message}` : 'the currently loaded data'}.
      <Link href="/dashboard" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
    </InfoCallout>
  );
}

interface CriticalDocsCalloutProps {
  criticalMissing: number;
  batchCount: number;
}

export function CriticalDocsCallout({ criticalMissing, batchCount }: CriticalDocsCalloutProps) {
  if (criticalMissing <= 0) return null;

  return (
    <InfoCallout variant="warning">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 240 }}>
          {criticalMissing} critical document missing across {batchCount} {pluralize(batchCount)}.
          {' '}Document audit is required before billing release.
        </span>
        <Link
          href="/documents"
          className="btn secondary sm"
          // `.btn.secondary` is gray by default; tinted amber here since
          // this button only ever sits inside the amber callout above.
          style={{ flexShrink: 0, color: 'var(--color-amber-dk)', borderColor: 'var(--color-amber-border)', background: 'var(--color-surface)' }}
        >
          Review docs
          <Icon name="arrow-narrow-right" size={14} />
        </Link>
      </div>
    </InfoCallout>
  );
}

interface DashboardCalloutsProps {
  syncFailed: boolean;
  isShowingCachedFallback: boolean;
  syncFailedMessage: string;
  criticalMissing: number;
  batchCount: number;
}

/**
 * Renders every dashboard banner in its fixed order. Each child self-guards
 * and returns null, so the route composes one element instead of two `&&`
 * expressions.
 */
export function DashboardCallouts({
  syncFailed,
  isShowingCachedFallback,
  syncFailedMessage,
  criticalMissing,
  batchCount,
}: DashboardCalloutsProps) {
  return (
    <>
      <SyncFailedCallout
        syncFailed={syncFailed}
        isShowingCachedFallback={isShowingCachedFallback}
        message={syncFailedMessage}
      />
      <CriticalDocsCallout criticalMissing={criticalMissing} batchCount={batchCount} />
    </>
  );
}
