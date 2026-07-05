/**
 * Dashboard Shell Layout
 *
 * Every screen (Dashboard, Batch Cards, Table View, Documents, Analytics,
 * Activity Log) shares this shell: a left navigation aside + a main column of
 * Topbar → MetricsRow → content (Figma node 8:4330 "Aside - Primary navigation").
 * The `(dashboard)` route group keeps URLs clean (/batch-cards, not /dashboard/...).
 *
 * SERVER vs CLIENT: this is a Server Component. MetricsRow derives its numbers
 * from the mock data layer at render time; Sidebar is the only client island
 * (it reads the pathname to highlight the active nav item).
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/routing/route-groups
 */

import { NavDrawerProvider } from '@/modules/shell/ui/NavDrawerProvider';
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import { MobileHeader } from '@/modules/shell/ui/MobileHeader';
import { Topbar } from '@/modules/shell/ui/Topbar';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavDrawerProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <MobileHeader />
          <main className="main-content">
            <Topbar />
            <MetricsRow />
            {children}
          </main>
        </div>
      </div>
    </NavDrawerProvider>
  );
}
