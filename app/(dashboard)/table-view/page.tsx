/**
 * SCREEN 2 — Table View
 *
 * WHY SECOND:
 * A table is a flat, row-by-row representation of batches. It shares the
 * same data shape as Batch Cards but a different layout. Building this after
 * Activity Log means you already have the data layer working.
 *
 * NEXT.JS CONCEPT: Server Component — data fetched at the top level,
 * no client JS needed. Sorting/filtering (if added later) can be done
 * server-side via searchParams.
 *
 * DOCS on searchParams (for server-side filtering):
 * https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
 * LEARN Ch 7 — Fetching Data: https://nextjs.org/learn/dashboard-app/fetching-data
 * LEARN Ch 11 — Search and Pagination: https://nextjs.org/learn/dashboard-app/adding-search-and-pagination
 *
 * SPEC RULES:
 *   - Table row height: 40px (--h-table-row)
 *   - Table header: t-table-head class (uppercase, muted, 11px)
 *   - Cell text: t-cell class (13px)
 *   - IDs, dates, percentages: t-mono class (IBM Plex Mono)
 *   - Alternate row background: --color-surface-alt on even rows
 *   - Urgency left border (3px) on the first cell of each row
 */

// TODO S2-1: Import MOCK_BATCHES from the data layer.
// import { MOCK_BATCHES } from '@/lib/data/mock-batches';

// TODO S2-2: Import StatusBadge component (build it in components/ui/StatusBadge.tsx).
// import { StatusBadge } from '@/components/ui/StatusBadge';

export default function TableViewPage() {
  // TODO S2-3: const batches = MOCK_BATCHES;

  // Column config: define this as a constant array above the component.
  // Each column: { key: string; label: string; width?: string }
  // Columns: Batch ID | Batch Name | Program | NC Level | Progress | Billing | BSRS | Status
  //
  // TIP: Defining column config as data (not JSX) makes it easy to add
  // sortable columns later — you'd add a `sortable: boolean` field.

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="t-page-title">Table View</h1>
        {/* TODO S2-4: Add Filter + Export actions (stubs for now). */}
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {/* TODO S2-5: Map over column config and render <th> for each.
                  Use t-table-head class. Add px-4 py-2 padding. */}
              <th className="t-table-head text-left px-4 py-2">BATCH ID</th>
              <th className="t-table-head text-left px-4 py-2">BATCH NAME</th>
              {/* TODO S2-5: add remaining columns */}
            </tr>
          </thead>
          <tbody>
            {/* TODO S2-6: Map over batches and render a DataTableRow for each.
                Reference ui_kits/admin/Misc.jsx (DataTableRow component) —
                port it to components/ui/DataTableRow.tsx.

                Row pattern:
                  <tr key={batch.id} className="h-10 border-b border-[var(--color-border-faint)]
                     even:bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface-raised)]
                     transition-colors duration-[var(--dur-base)]">
                    <td className="t-mono px-4">{batch.id}</td>
                    ...
                  </tr> */}
            <tr>
              <td className="t-body p-4" colSpan={8}>
                Table placeholder — complete TODO S2-3 and S2-6.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
