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
 * TRAINER OMISSION: this layout mounts MetricsRow once for every route under
 * `(dashboard)`, including `/trainer/*`. Trainer-facing surfaces must omit
 * billing figures server-side (CLAUDE.md role rules) — but layouts don't
 * receive `searchParams`, and no real trainer accounts exist yet (TES-34) to
 * key off Clerk role metadata, so route path is the only signal available
 * here. `proxy.ts` forwards the path as the `x-pathname` header for this
 * reason; see that file's doc comment.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/routing/route-groups
 */

import { headers } from 'next/headers';
import { requireAuthenticatedUser } from '@/modules/auth/data/auth';
import { NavDrawerProvider } from '@/modules/shell/ui/NavDrawerProvider';
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import { MobileHeader } from '@/modules/shell/ui/MobileHeader';
import { Topbar } from '@/modules/shell/ui/Topbar';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedUser();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isTrainerRoute = pathname.startsWith('/trainer');

  return (
    <NavDrawerProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <MobileHeader />
          <main className="main-content">
            <Topbar />
            <MetricsRow hideBilling={isTrainerRoute} />
            {children}
          </main>
        </div>
      </div>
    </NavDrawerProvider>
  );
}
