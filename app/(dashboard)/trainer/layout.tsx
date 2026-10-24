/**
 * KPI row for the trainer screens — the trainer's own classes, which RLS
 * already limits to batches assigned to them (`can_read_batch`), so no tenant
 * scope is applied. Billing figures are omitted server-side, never CSS-hidden
 * (CLAUDE.md role rules).
 *
 * Mounted here rather than in the root `(dashboard)` layout so the row is
 * owned by the segment it describes.
 */

import type { ReactNode } from 'react';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';

const TRAINER_LINKS = { batches: '/trainer/classes', attention: '/trainer/classes', documents: '/trainer/classes' };

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const snapshot = await getBatchesSnapshot();
  const metrics = snapshot.status === 'ok' ? deriveDashboardMetrics(selectBatchesForDisplay(snapshot)) : null;
  return (
    <>
      {metrics && <MetricsRow metrics={metrics} links={TRAINER_LINKS} hideBilling />}
      {children}
    </>
  );
}
