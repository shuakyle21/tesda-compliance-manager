/**
 * SCREEN 3 — Documents Matrix
 *
 * WHY THIRD:
 * The Documents Matrix is a cross-tabulation: batches on rows, required
 * documents on columns. It introduces a 2D data structure — good to tackle
 * after you're comfortable with the flat list (Activity Log) and flat table
 * (Table View).
 *
 * NEXT.JS CONCEPT: Server Component with derived data.
 * The document status per batch is computed from the batch records.
 * This is pure data transformation — no client JS needed.
 *
 * SPEC RULES:
 *   - Missing document cell: 'file-off' icon, red-lt background
 *   - Present document cell: 'check' icon, green-lt background
 *   - Document link is an external-link icon — opens Notion (later)
 *   - Column headers are document names (AOU, NTP, TIP, Assessment, Billing)
 *   - Row headers are batch IDs (t-mono) + batch name (t-cell)
 */

// TODO S3-1: Import MOCK_BATCHES.
// import { MOCK_BATCHES } from '@/lib/data/mock-batches';

// TODO S3-2: Define the REQUIRED_DOCS constant — an array of document types
// that every batch must have. Derive their status from the batch's lifecycle array.
//
// Example:
//   const REQUIRED_DOCS = [
//     { key: 'aou',    label: 'AOU',        lifecycleKey: 'aou'    },
//     { key: 'ntp',    label: 'NTP',        lifecycleKey: 'ntp'    },
//     { key: 'tip',    label: 'TIP',        lifecycleKey: 'tip'    },
//     { key: 'assess', label: 'Assessment', lifecycleKey: 'assess' },
//     { key: 'bill',   label: 'Billing',    lifecycleKey: 'bill'   },
//   ];

export default function DocumentsPage() {
  // TODO S3-3: const batches = MOCK_BATCHES;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="t-page-title">Documents</h1>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="t-table-head text-left px-4 py-2 w-48">BATCH</th>
              {/* TODO S3-4: Map over REQUIRED_DOCS to render column headers. */}
            </tr>
          </thead>
          <tbody>
            {/* TODO S3-5: Map over batches, then over REQUIRED_DOCS per row.
                For each cell, check if the matching lifecycle stage is 'done'.
                  done    → green-lt bg + check icon
                  pending → red-lt bg + file-off icon

                Reference: ui_kits/admin/Misc.jsx (DocumentLinkRow)
                Port to: components/ui/DocumentCell.tsx */}
            <tr>
              <td className="t-body p-4" colSpan={6}>
                Documents placeholder — complete TODO S3-3 through S3-5.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
