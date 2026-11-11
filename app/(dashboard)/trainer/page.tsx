/**
 * The KPI row shows on this dashboard only, not on the class screens. It
 * covers the trainer's own classes, which RLS already limits to batches
 * assigned to them (`can_read_batch`), so no tenant scope is applied. Billing
 * figures are omitted server-side, never CSS-hidden (CLAUDE.md role rules).
 */

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
        <p className="t-body mt-2">
          Route mapped from Figma Frame 7 - Trainer Dashboard. This route is
          trainer-only and must show assigned classes, attendance, progress, and
          training-side tasks only.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
        <p className="t-body">
          Trainer dashboard placeholder - API must hide billing deadline, BSRS,
          NTP lag, billing preparation, and financial document fields.
        </p>
      </div>
    </div>
  );
}
