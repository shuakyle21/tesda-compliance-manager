/**
 * `/overview` — the Managed TVI overview: the admin cross-school view
 * (unscoped by design).
 *
 * The one office screen that reads every school the caller belongs to.
 * Admin-only on `profiles.role`; anyone else is sent to `/dashboard`, which
 * routes them to their own school. RLS remains the boundary underneath — this
 * read returns only schools the caller is a member of.
 *
 * `?school=`, `?program=` and `?qualification=` narrow the view. They are
 * parsed against the caller's own schools and batches
 * (`parseOverviewFilters`), so they only select among rows already returned;
 * an unknown value means "All". Every section reads the one filtered set.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { getActivitySnapshot } from '@/modules/activity/data/activity';
import { getBatchesSnapshot } from '@/modules/batches/data/batches';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import {
  applyOverviewFilters,
  crossSchoolQueue,
  overviewFilterOptions,
  parseOverviewFilters,
  schoolSummaries,
} from '@/modules/batches/domain/overview';
import { SchoolsOverview } from '@/modules/batches/ui/overview/SchoolsOverview';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { getSignedInProfile } from '../tenant-scope';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const retry = <Link href="/overview" className="btn primary" style={{ marginTop: 12 }}>Try again</Link>;

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSignedInProfile();
  if (profile === 'unknown') {
    return (
      <EmptyState iconName="alert-triangle" heading="Couldn't verify your access"
        sub="We weren't able to read your profile just now. This is usually temporary." action={retry} />
    );
  }
  if (profile === 'none' || (await resolveTrustedRole(profile.role)) !== 'admin') redirect('/dashboard');
  if (profile.tenants.length === 0) return <NoTenantAccessState subject="the school overview" />;

  const snapshot = await getBatchesSnapshot();
  if (snapshot.status === 'unconfigured') {
    return <EmptyState iconName="database" heading="Data source not connected" sub="Batch data isn't connected in this environment." />;
  }
  if (snapshot.status !== 'ok') {
    return (
      <EmptyState iconName="refresh" heading="Unable to load data"
        sub="Batch data for your schools isn't available right now. Try again in a moment." action={retry} />
    );
  }

  const schools = profile.tenants.map((t) => ({ tenantId: t.id, code: t.code, name: t.name }));
  const options = overviewFilterOptions(snapshot.batches, schools);
  const filters = parseOverviewFilters(await searchParams, options);
  const inView = applyOverviewFilters(snapshot.batches, schools, filters);
  // UTC date, the same day basis the batch mapper counts deadlines from.
  const summaries = schoolSummaries(inView.batches, inView.schools, new Date().toISOString().slice(0, 10));

  // Activity events carry no school name, so the feed is shown only for one
  // selected school. Its tenant id comes from the caller's own memberships:
  // scope selection on top of RLS, not authorization.
  const selected = filters.school ? inView.schools[0] : undefined;
  const activity = selected ? await getActivitySnapshot(6, 0, selected.tenantId) : null;

  return (
    <SchoolsOverview
      summaries={summaries}
      queue={crossSchoolQueue(summaries)}
      metrics={deriveDashboardMetrics(inView.batches)}
      batches={inView.batches}
      filters={filters}
      options={options}
      hiddenSchools={inView.hiddenSchools}
      fetchedAt={snapshot.fetchedAt}
      activity={selected && activity?.status === 'ok'
        ? { events: activity.events, href: scopedPath(selected.code, 'activity-log') }
        : undefined}
    />
  );
}
