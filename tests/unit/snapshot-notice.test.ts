import { describe, expect, it } from 'vitest';
import { snapshotNotice, type SnapshotStatus } from '@/shared/ui/snapshotNotice';

describe('snapshotNotice', () => {
  it('a failed fetch with zero rows is a failure, never an empty state (RULES.md rule 19)', () => {
    expect(snapshotNotice('sync-failed', false)).toBe('failed');
  });

  it('a failed fetch with rows keeps the rows and shows a banner', () => {
    expect(snapshotNotice('sync-failed', true)).toBe('failed-banner');
  });

  it('shows the page content when there are rows and no failure', () => {
    expect(snapshotNotice('ok', true)).toBe('none');
  });

  it('an ok snapshot with no rows is the ordinary empty state', () => {
    expect(snapshotNotice('ok', false)).toBe('empty');
  });

  it('maps the no-school and unconfigured states to their own notices', () => {
    expect(snapshotNotice('no-tenant-access', false)).toBe('no-access');
    expect(snapshotNotice('unconfigured', false)).toBe('unconfigured');
  });

  it('never returns the ordinary empty state for a non-ok snapshot', () => {
    const statuses: SnapshotStatus[] = ['no-tenant-access', 'sync-failed', 'unconfigured'];
    for (const status of statuses) expect(snapshotNotice(status, false)).not.toBe('empty');
  });
});
