'use client';

/**
 * TanStack Query client for the dashboard's on-demand drill-in reads (batch
 * roster, per-batch documents). Page-level reads stay in Server Components —
 * see `modules/batches/data/batches.ts` — because trainer field omission is
 * done by server-side stripping and RLS is row-level, not column-level.
 *
 * Mounted at `app/(dashboard)/layout.tsx`, not the root layout, per the
 * standing convention recorded in `app/layout.tsx`: providers go at the lowest
 * layout that actually needs them. Nothing outside `(dashboard)` queries.
 *
 * A client context so a server-rendered layout can still wrap server-component
 * children — same arrangement as `NavDrawerProvider`.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state, never at module scope: a module-level client is shared
  // by every render on the server, which in a multi-tenant app means one
  // school's cached rows served to the next request. This keeps it per-mount.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // `sync-failed` is the only arm the queryFn throws, and it is
            // transient, so one retry is useful. `unconfigured` and
            // `no-tenant-access` resolve as data and never reach retry.
            retry: 1,
            // A compliance tool must not reorder a roster under the reader's
            // cursor because they alt-tabbed.
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
