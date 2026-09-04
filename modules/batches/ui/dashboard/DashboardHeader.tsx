/**
 * Dashboard page heading — title plus the subline that states whose workspace
 * this is, how many batches are active, and how fresh the data is.
 *
 * The freshness stamp is deliberately honest: with no live `updated_at` to
 * read it prints "unknown" rather than a plausible-looking timestamp, and the
 * stale marker is text ("STALE"), not colour alone — status must never be
 * carried by colour on its own (RULES.md §4).
 */

import { pluralize } from '@/shared/text';

// Shown whenever there's no live `updated_at` to read — either the cached
// fallback (Supabase unconfigured or sync failed) or an `ok` snapshot with no
// batch rows to stamp. Deliberately doesn't say "cached": it isn't always.
const DATA_AS_OF_FALLBACK = 'unknown';

function StaleBadge({ isStale }: { isStale: boolean }) {
  if (!isStale) return null;

  return (
    <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-amber) 18%, var(--color-surface))', color: 'var(--color-amber-dk)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>
      STALE
    </span>
  );
}

interface DashboardHeaderProps {
  roleLabel: string;
  activeBatches: number;
  /** Null when there is no real timestamp to show. */
  dataAsOfLabel: string | null;
  isStale: boolean;
}

export function DashboardHeader({ roleLabel, activeBatches, dataAsOfLabel, isStale }: DashboardHeaderProps) {
  return (
    <div className="page-head">
      <h1>Dashboard</h1>
      <span className="subline">
        {roleLabel} workspace · {activeBatches} active {pluralize(activeBatches)}
        {' · '}Data as of {dataAsOfLabel ?? DATA_AS_OF_FALLBACK}
        <StaleBadge isStale={isStale} />
      </span>
    </div>
  );
}

/**
 * Bare heading for the guard states that render before a role or any data is
 * known — no workspace label and no freshness claim, because neither has been
 * established at that point.
 */
export function DashboardHeaderPlain() {
  return (
    <div className="page-head">
      <h1>Dashboard</h1>
    </div>
  );
}
