/**
 * The KPI row shows on this dashboard only, not on the class screens. It
 * covers the trainer's own classes, which RLS already limits to batches
 * assigned to them (`can_read_batch`), so no tenant scope is applied. Billing
 * figures are omitted server-side, never CSS-hidden (CLAUDE.md role rules).
 */

import Link from 'next/link';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';

const TRAINER_LINKS = { batches: '/trainer/classes', attention: '/trainer/classes', documents: '/trainer/classes' };

export default async function TrainerDashboardPage() {
  const snapshot = await getBatchesSnapshot();
  const metrics = snapshot.status === 'ok' ? deriveDashboardMetrics(selectBatchesForDisplay(snapshot)) : null;
  return (
    <div>
      {metrics && <MetricsRow metrics={metrics} links={TRAINER_LINKS} hideBilling />}
      <div className="mb-6">
        <h1 className="t-page-title">Teaching dashboard</h1>
        <p className="t-body mt-2">Your assigned classes, attendance and training progress.</p>
        <Link href="/trainer/classes" className="btn secondary mt-3">View my classes</Link>
      </div>
    </div>
  );
}
