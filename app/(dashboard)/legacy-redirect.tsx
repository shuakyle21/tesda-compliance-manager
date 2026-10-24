/**
 * Shared body for the legacy unscoped routes (`/batch-cards`, `/documents`, …).
 * Office screens now live under `/t/<school>/…`; an old link or bookmark
 * lands here and is forwarded to the same section of the caller's default
 * school. Only when there is no school to send them to does this render.
 */

import Link from 'next/link';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import type { ScopedSection } from '@/modules/tenancy/domain/scope';
import { redirectToDefaultScope } from './tenant-scope';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function LegacyScopeRedirect({ section, searchParams }: { section: ScopedSection; searchParams: SearchParams }) {
  const outcome = await redirectToDefaultScope(section, await searchParams);
  if (outcome.status === 'no-tenant-access') return <NoTenantAccessState subject="this screen" />;
  return (
    <EmptyState
      iconName="alert-triangle"
      heading="Couldn't verify your school access"
      sub="We weren't able to read your school memberships just now. This is usually temporary."
      action={<Link href={`/${section}`} className="btn primary" style={{ marginTop: 12 }}>Try again</Link>}
    />
  );
}

/** Builds a legacy route's default export for one section. */
export function legacyRoute(section: ScopedSection) {
  return async function LegacyRoute({ searchParams }: { searchParams: SearchParams }) {
    return <LegacyScopeRedirect section={section} searchParams={searchParams} />;
  };
}
