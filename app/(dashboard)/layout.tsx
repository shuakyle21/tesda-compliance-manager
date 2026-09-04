import { headers } from 'next/headers';
import { requireAuthenticatedUser } from '@/modules/auth/data/auth';
import { NavDrawerProvider } from '@/modules/shell/ui/NavDrawerProvider';
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import { MobileHeader } from '@/modules/shell/ui/MobileHeader';
import { Topbar } from '@/modules/shell/ui/Topbar';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedUser();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isTrainerRoute = pathname.startsWith('/trainer');
  const isDashboardRoute = pathname === '/dashboard';

  const batchesSnapshot = await getBatchesSnapshot();
  const metrics =
    isDashboardRoute || batchesSnapshot.status === 'sync-failed'
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
