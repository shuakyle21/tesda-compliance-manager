/**
 * Which notice a screen shows for a data snapshot. Pure, so the ordering rule
 * is unit-tested. RULES.md rule 19: sync-failed is checked before emptiness, so
 * a failed fetch with zero rows never reads as "nothing here".
 */

export type SnapshotStatus = 'ok' | 'no-tenant-access' | 'sync-failed' | 'unconfigured';

export type SnapshotNotice = 'none' | 'no-access' | 'unconfigured' | 'failed' | 'failed-banner' | 'empty';

export function snapshotNotice(status: SnapshotStatus, hasRows: boolean): SnapshotNotice {
  if (status === 'sync-failed') return hasRows ? 'failed-banner' : 'failed';
  if (hasRows) return 'none';
  if (status === 'no-tenant-access') return 'no-access';
  if (status === 'unconfigured') return 'unconfigured';
  return 'empty';
}
