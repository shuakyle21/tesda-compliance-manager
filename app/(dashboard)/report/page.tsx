/**
 * SCREEN ROUTE — Report (TESDA EGACE + Employment)
 *
 * Server Component shell: reads the portfolio batch set from the mock data
 * layer and hands it to the interactive ReportView client island, which builds
 * the EGACE funnel/table, the post-training employment report, and the real
 * .xlsx (T2MIS) export.
 */

import { MOCK_BATCHES } from '@/shared/mocks';
import { TENANTS } from '@/shared/mocks/seed';
import { ReportView } from '@/modules/reports/ui/ReportView';

export default function ReportPage() {
  return <ReportView batches={MOCK_BATCHES} tenants={TENANTS} />;
}
