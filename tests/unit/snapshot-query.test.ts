import { describe, it, expect } from 'vitest';
import { SyncFailedError, unwrapSnapshot } from '@/shared/snapshotQuery';

/**
 * The throw/return split is the contract every drill-in `queryFn` depends on:
 * only arms a retry could plausibly fix may reject. Getting this backwards is
 * silent — the UI would either retry a permanent condition forever, or treat a
 * transient outage as a settled answer and render an empty state over it.
 */
describe('unwrapSnapshot', () => {
  it('throws on sync-failed so TanStack Query can retry and flag isError', () => {
    expect(() => unwrapSnapshot({ status: 'sync-failed', error: 'boom' })).toThrow(
      SyncFailedError,
    );
  });

  it('keeps the raw database message out of the thrown error', () => {
    // The snapshot's `error` may name tables, columns, or internal ids. An
    // error that never carries the text cannot leak it through an error
    // boundary or a logger added later.
    let caught: unknown;
    try {
      unwrapSnapshot({ status: 'sync-failed', error: 'relation "learners" does not exist' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).not.toContain('learners');
    expect((caught as Error).message).not.toContain('relation');
  });

  it('returns unconfigured as data — retrying a missing env var changes nothing', () => {
    const snapshot = { status: 'unconfigured' } as const;
    expect(unwrapSnapshot(snapshot)).toBe(snapshot);
  });

  it('returns no-tenant-access as data so its mandated screen renders at once', () => {
    const snapshot = { status: 'no-tenant-access' } as const;
    expect(unwrapSnapshot(snapshot)).toBe(snapshot);
  });

  it('passes an ok snapshot through by reference, payload untouched', () => {
    const snapshot = { status: 'ok', learners: [{ seq: 1 }] } as const;
    expect(unwrapSnapshot(snapshot)).toBe(snapshot);
  });

  it('treats an empty ok result as authoritative, not as a failure', () => {
    // ADR-005 §5: an `ok` snapshot is authoritative even when empty. It must
    // never be converted into an error, which would show a retry prompt where
    // the honest answer is "there is nothing here yet".
    const snapshot = { status: 'ok', learners: [] } as const;
    expect(() => unwrapSnapshot(snapshot)).not.toThrow();
    expect(unwrapSnapshot(snapshot).learners).toEqual([]);
  });
});
