/**
 * Browser download of the T2MIS terminal-report workbook. Does DOM/Blob/URL
 * I/O, so it stays in `ui/`; the sheet layout is
 * `modules/import-export/domain/t2mis.ts` and the writer is `../domain/xlsx.ts`.
 */

import type { Batch, Tenant } from '@/shared/types';
import type { ToastData } from '@/shared/ui/Toast';
import { T2MIS_HEADERS, buildT2misRows } from '@/modules/import-export/domain/t2mis';
import { buildXlsx } from '@/modules/reports/domain/xlsx';

/** Builds and downloads the T2MIS EGACE + employment .xlsx, then reports the result via `onResult`. */
export function exportXlsx(rows: Batch[], tenantOf: (id: string) => Tenant, onResult: (toast: ToastData) => void): void {
  const data = buildT2misRows(rows, tenantOf);
  try {
    const blob = buildXlsx(T2MIS_HEADERS, data, 'EGACE-Employment');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TESDA-T2MIS-EGACE-Employment-Report.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onResult({
      title: 'Excel export ready',
      message: `TESDA-T2MIS-EGACE-Employment-Report.xlsx downloaded — ${data.length} scholar records across ${rows.length} batches.`,
    });
  } catch {
    onResult({ title: 'Export failed', message: 'Could not build the workbook in this browser.' });
  }
}
