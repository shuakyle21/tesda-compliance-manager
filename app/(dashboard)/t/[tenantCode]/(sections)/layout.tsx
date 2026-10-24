/**
 * KPI row for every scoped office section except the dashboard (which renders
 * its own row with the Needs-attention card).
 *
 * It lives here — under the `[tenantCode]` segment — and not in the root
 * `(dashboard)` layout, because App Router does not re-render a parent layout
 * on client-side navigation. A row rendered from the root layout kept showing
 * the previous school's numbers after a school switch, which is exactly the
 * wrong-school bug the tenant scope exists to fix. This layout gets the school
 * from its own params, so a new school is a new render.
 *
 * `(sections)` is a route group: it changes no URL.
 */

import type { ReactNode } from 'react';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { requireScope } from '../../../tenant-scope';

export default async function ScopedSectionsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantCode: string }>;
}) {
  const resolved = await requireScope(params);
  // No scope: the `[tenantCode]` layout above is rendering the right state.
  if (!resolved) return children;
  const { scope, profile } = resolved;

  // A metrics strip is a claim about a school; on anything but a live `ok`
  // read it would be a claim about nothing, so it is omitted instead.
  const snapshot = withTenantAccess(await getBatchesSnapshot(scope.tenantId), tenantAccessOf(profile));
  const metrics = snapshot.status === 'ok' ? deriveDashboardMetrics(selectBatchesForDisplay(snapshot)) : null;

  return (
    <>
      {metrics && (
        <MetricsRow
          metrics={metrics}
          links={{
            batches: scopedPath(scope.code, 'table-view'),
            attention: scopedPath(scope.code, 'dashboard'),
            documents: scopedPath(scope.code, 'documents'),
          }}
          // Trainer-facing figures omit billing server-side (CLAUDE.md role rules).
          hideBilling={profile.role === 'trainer'}
        />
      )}
      {children}
    </>
  );
}
