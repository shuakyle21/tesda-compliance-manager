/**
 * Adapter between the data layer's discriminated snapshots and TanStack Query's
 * resolve/reject contract.
 *
 * Snapshots *resolve* `{ status: 'sync-failed' }` rather than throwing, which is
 * right for Server Components — a route maps the arm straight to a state. But a
 * resolved value is a success to TanStack, so `retry`, `isError`, and error
 * boundaries would never fire. The split below decides by one question: could
 * retrying ever change the answer?
 *
 *   - `sync-failed`      transient (network, timeout, a database hiccup) -> throw
 *   - `unconfigured`     no Supabase env; retrying forever changes nothing -> data
 *   - `no-tenant-access` the caller belongs to no school; likewise          -> data
 *
 * The two terminal arms stay as data because each has its own mandated screen —
 * `no-tenant-access` must render `NoTenantAccessState`, never an ordinary empty
 * state — and burning retries on them would only delay that screen.
 */

/**
 * Signals a transient data-layer failure to TanStack Query.
 *
 * Deliberately carries no detail: the snapshot's `error` holds the raw Supabase
 * message, which may name tables, columns, or internal ids, and CLAUDE.md
 * forbids those reaching the UI. An error that never holds the text cannot leak
 * it through an error boundary or a logger someone adds later. The failing
 * request is still fully visible in the Network tab for debugging.
 */
export class SyncFailedError extends Error {
  constructor() {
    super('The data layer reported a sync failure.');
    this.name = 'SyncFailedError';
  }
}

/**
 * Throws on the `sync-failed` arm and returns every other arm unchanged, so a
 * `queryFn` can hand the result straight to the component.
 *
 * The return type drops `sync-failed`, which means a component consuming
 * `data` gets an exhaustive switch over only the arms that can actually reach
 * it — a new snapshot arm added upstream still has to be handled.
 */
export function unwrapSnapshot<T extends { status: string }>(
  snapshot: T,
): Exclude<T, { status: 'sync-failed' }> {
  if (snapshot.status === 'sync-failed') {
    throw new SyncFailedError();
  }

  return snapshot as Exclude<T, { status: 'sync-failed' }>;
}
