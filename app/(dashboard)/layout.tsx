import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { requireAuthenticatedUser } from '@/modules/auth/data/auth';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import { isPlatformAdmin as resolveIsPlatformAdmin } from '@/modules/tenancy/data/platform';
import { NavDrawerProvider } from '@/modules/shell/ui/NavDrawerProvider';
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import { MobileHeader } from '@/modules/shell/ui/MobileHeader';
import { Topbar } from '@/modules/shell/ui/Topbar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const clerkUserId = await requireAuthenticatedUser();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isTrainerRoute = pathname.startsWith('/trainer');

  // Real role, for nav that must not be shown to the wrong person (the
  // admin-only "Add user" row). Trusted sources only — `resolveTrustedRole`,
  // never `resolveRouteRole`, whose `?role=` preview override would let any
  // caller conjure the row. This only decides what the menu lists; the route
  // and Server Action re-check it, and RLS sits under both.
  const profileSnapshot = await getProfileSnapshot(clerkUserId);
  const dbRole = profileSnapshot.status === 'ok' ? profileSnapshot.profile.role : null;
  const isAdmin = (await resolveTrustedRole(dbRole)) === 'admin';

  // Real identity + tenant list for the Sidebar's user card and school
  // switcher, read off the same snapshot rather than a second fetch.
  const fullName = profileSnapshot.status === 'ok' ? profileSnapshot.profile.fullName : null;
  const tenants = profileSnapshot.status === 'ok' ? profileSnapshot.profile.tenants : [];
  const defaultTenantId = profileSnapshot.status === 'ok' ? profileSnapshot.profile.defaultTenantId : null;

  // Platform operator (ADR-006), for the "Add school" row. A separate axis
  // from `isAdmin`: it is not read from `profiles.role` at all, but from the
  // `platform_admins` table via a `security definer` RPC, because that table
  // is deliberately unreadable through the anon client. The boolean-only
  // helper is right here -- a failed check should hide the row rather than
  // render a link into a denial. The route itself tells `sync-failed` apart
  // from `denied`, because there the two need different screens.
  const isPlatformAdmin = await resolveIsPlatformAdmin();

  // The KPI row is not rendered here: a root layout does not re-render on
  // client-side navigation, so a row placed here kept the previous school's
  // numbers after a school switch. It is owned by the segment it describes —
  // `t/[tenantCode]/(sections)/layout.tsx` and `trainer/layout.tsx`.

  return (
    <NavDrawerProvider>
      <div className="app-layout">
        <Sidebar
          isTrainerRoute={isTrainerRoute}
          isAdmin={isAdmin}
          isPlatformAdmin={isPlatformAdmin}
          fullName={fullName}
          role={dbRole}
          tenants={tenants}
          defaultTenantId={defaultTenantId}
        />
        <div className="main-area">
          <MobileHeader />
          <main className="main-content">
            <Topbar isTrainerRoute={isTrainerRoute} />
            {children}
          </main>
        </div>
      </div>
    </NavDrawerProvider>
  );
}

