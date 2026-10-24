/**
 * `/overview` — the admin cross-school management view (unscoped by design).
 *
 * The one office screen that reads every school the caller belongs to, and
 * it groups every figure by school (`modules/batches/domain/overview.ts`), so
 * nothing is summed under a single school's name. Admin-only on
 * `profiles.role`; anyone else is sent to `/dashboard`, which routes them to
 * their own school. RLS remains the boundary underneath — this read returns
 * only schools the caller is a member of.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { getBatchesSnapshot } from '@/modules/batches/data/batches';
import { crossSchoolExceptions, schoolSummaries } from '@/modules/batches/domain/overview';
import { SchoolsOverview } from '@/modules/batches/ui/overview/SchoolsOverview';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { getSignedInProfile } from '../tenant-scope';

export default async function OverviewPage() {
  const profile = await getSignedInProfile();
  if (profile === 'unknown') {
    return (
      <EmptyState iconName="alert-triangle" heading="Couldn't verify your access"
        sub="We weren't able to read your profile just now. This is usually temporary."
        action={<Link href="/overview" className="btn primary" style={{ marginTop: 12 }}>Try again</Link>} />
    );
  }
  if (profile === 'none' || (await resolveTrustedRole(profile.role)) !== 'admin') redirect('/dashboard');
  if (profile.tenants.length === 0) return <NoTenantAccessState subject="the school overview" />;

  const snapshot = await getBatchesSnapshot();
  if (snapshot.status !== 'ok') {
    return (
      <EmptyState iconName="refresh" heading="Unable to load data"
        sub="Batch data for your schools isn't available right now. Try again in a moment."
        action={<Link href="/overview" className="btn primary" style={{ marginTop: 12 }}>Try again</Link>} />
    );
  }

  const schools = profile.tenants.map((t) => ({ tenantId: t.id, code: t.code, name: t.name }));
  const summaries = schoolSummaries(snapshot.batches, schools);
  return <SchoolsOverview summaries={summaries} exceptions={crossSchoolExceptions(summaries)} />;
}
