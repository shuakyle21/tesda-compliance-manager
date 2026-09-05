import { headers } from 'next/headers';
import { requireAuthenticatedUser } from '@/modules/auth/data/auth';
import { NavDrawerProvider } from '@/modules/shell/ui/NavDrawerProvider';
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import { MobileHeader } from '@/modules/shell/ui/MobileHeader';
import { Topbar } from '@/modules/shell/ui/Topbar';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { withTenantAccess } from '@/modules/tenancy/domain/access';
import { resolveTenantAccess } from './tenant-access';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedUser();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isTrainerRoute = pathname.startsWith('/trainer');
  const isDashboardRoute = pathname === '/dashboard';

  const batchesSnapshot = withTenantAccess(await getBatchesSnapshot(), await resolveTenantAccess());
  // A metrics strip reading 0 batches / 0 scholars is a claim about a school.
  // For someone attached to no school it is a claim about nothing, so it is
  // suppressed alongside the sync-failed case rather than rendered as zeros.
  const metrics =
    isDashboardRoute ||
    batchesSnapshot.status === 'sync-failed' ||
    batchesSnapshot.status === 'no-tenant-access'
      ? null
      : deriveDashboardMetrics(selectBatchesForDisplay(batchesSnapshot), []);

  return (
    <NavDrawerProvider>
      <div className="app-layout">
        <Sidebar isTrainerRoute={isTrainerRoute} />
        <div className="main-area">
          <MobileHeader />
          <main className="main-content">
            <Topbar isTrainerRoute={isTrainerRoute} />
            {metrics && <MetricsRow metrics={metrics} hideBilling={isTrainerRoute} />}
            {children}
          </main>
        </div>
      </div>
    </NavDrawerProvider>
  );
}
