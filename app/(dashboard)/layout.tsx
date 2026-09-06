import { headers } from 'next/headers';
import { requireAuthenticatedUser } from '@/modules/auth/data/auth';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { deriveTenantAccess, getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import { isPlatformAdmin as resolveIsPlatformAdmin } from '@/modules/tenancy/data/platform';
import { NavDrawerProvider } from '@/modules/shell/ui/NavDrawerProvider';
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import { MobileHeader } from '@/modules/shell/ui/MobileHeader';
import { Topbar } from '@/modules/shell/ui/Topbar';
import { MetricsRow } from '@/modules/shell/ui/MetricsRow';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { withTenantAccess } from '@/modules/tenancy/domain/access';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const clerkUserId = await requireAuthenticatedUser();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isTrainerRoute = pathname.startsWith('/trainer');
  const isDashboardRoute = pathname === '/dashboard';

  // Real role, for nav that must not be shown to the wrong person (the
  // admin-only "Add user" row). Trusted sources only — `resolveTrustedRole`,
  // never `resolveRouteRole`, whose `?role=` preview override would let any
  // caller conjure the row. This only decides what the menu lists; the route
  // and Server Action re-check it, and RLS sits under both.
  const profileSnapshot = await getProfileSnapshot(clerkUserId);
  const dbRole = profileSnapshot.status === 'ok' ? profileSnapshot.profile.role : null;
  const isAdmin = (await resolveTrustedRole(dbRole)) === 'admin';

  // Platform operator (ADR-006), for the "Add school" row. A separate axis
  // from `isAdmin`: it is not read from `profiles.role` at all, but from the
  // `platform_admins` table via a `security definer` RPC, because that table
  // is deliberately unreadable through the anon client. The boolean-only
  // helper is right here -- a failed check should hide the row rather than
  // render a link into a denial. The route itself tells `sync-failed` apart
  // from `denied`, because there the two need different screens.
  const isPlatformAdmin = await resolveIsPlatformAdmin();

  // Derived from the snapshot already read above, not via `resolveTenantAccess`:
  // that helper exists to look up the profile for callers who do not hold one,
  // and its "no signed-in user → unknown" branch is unreachable here because
  // `requireAuthenticatedUser` has already redirected. Sibling routes that lack
  // a snapshot still call it. Please do not restore the indirection.
  const batchesSnapshot = withTenantAccess(
    await getBatchesSnapshot(),
    deriveTenantAccess(profileSnapshot),
  );
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
        <Sidebar isTrainerRoute={isTrainerRoute} isAdmin={isAdmin} isPlatformAdmin={isPlatformAdmin} />
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
