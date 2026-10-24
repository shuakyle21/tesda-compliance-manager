/**
 * `/dashboard` — the landing route after sign-in, kept as a stable entry point.
 *
 * It renders nothing of its own; it decides where the signed-in person starts,
 * from `profiles.role` (the database role RLS also reads — Clerk metadata is
 * identity only, never authority):
 *   - trainer      → `/trainer`
 *   - admin        → `/overview`, the cross-school management view
 *   - everyone else → `/t/<default school>/dashboard`
 */

import { redirect } from 'next/navigation';
import { LegacyScopeRedirect } from '../legacy-redirect';
import { getSignedInProfile } from '../tenant-scope';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardLanding({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSignedInProfile();
  if (profile !== 'none' && profile !== 'unknown') {
    if (profile.role === 'trainer') redirect('/trainer');
    if (profile.role === 'admin') redirect('/overview');
  }
  return <LegacyScopeRedirect section="dashboard" searchParams={searchParams} />;
}
