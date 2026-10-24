/**
 * Tenant-scope gate for every office screen under `/t/<school>/…`.
 *
 * Validates the URL's school code against the caller's own memberships on the
 * server before any page in the segment renders. A code that is not one of
 * their schools never falls back to "all schools" — it renders a plain
 * not-available state with a link to a school they do belong to. Pages then
 * call `requireScope()` (same `cache()`d read) for the validated scope.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { resolveRouteScope } from '../../tenant-scope';

export default async function TenantScopeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const resolved = await resolveRouteScope(tenantCode);

  if (resolved.status === 'ok') return children;
  if (resolved.status === 'no-tenant-access') return <NoTenantAccessState subject="this school" />;
  if (resolved.status === 'unknown') {
    return (
      <EmptyState
        iconName="alert-triangle"
        heading="Couldn't verify your school access"
        sub="We weren't able to read your school memberships just now. This is usually temporary."
        action={<Link href="/dashboard" className="btn primary" style={{ marginTop: 12 }}>Try again</Link>}
      />
    );
  }
  return (
    <EmptyState
      iconName="shield-off"
      heading="School not available"
      sub="This school isn't one of yours, or its code has changed. Pick one of your schools from the switcher."
      action={resolved.fallback
        ? <Link href={scopedPath(resolved.fallback.code, 'dashboard')} className="btn primary" style={{ marginTop: 12 }}>Go to {resolved.fallback.name}</Link>
        : undefined}
    />
  );
}
