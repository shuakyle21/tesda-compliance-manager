/**
 * SCREEN ROUTE — Add a school (FR-02, ADR-006).
 *
 * The screen `/users/new` presupposes. That one grants a person access to a
 * school; nothing created the school. The three tenants in the system were
 * inserted by hand at the bottom of the canonical migration, so onboarding a
 * new TVI meant editing SQL.
 *
 * The operating model is ADR-006's: the platform operator provisions a school
 * on request, the way TESDA itself issues T2MIS/BSRS accounts, then hands it
 * to that school's own admin through `/users/new`. A platform admin can see
 * and write the school *registry* and nothing else — no policy grants them
 * batches, learners, documents or LAMR.
 *
 * Server Component: resolves whether the caller is a platform admin, hands
 * the form the national qualifications list, and composes the client island.
 * No business logic here — validation is
 * `modules/tenancy/domain/schoolDraft.ts`, the write is
 * `modules/tenancy/data/schools.ts`, and the Server Action is `./actions.ts`.
 */

import Link from 'next/link';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { getPlatformAdminSnapshot } from '@/modules/tenancy/data/platform';
import { listQualifications } from '@/modules/tenancy/data/schools';
import { CreateSchoolForm } from '@/modules/tenancy/ui/CreateSchoolForm';
import { createSchoolAction } from './actions';

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Add school</h1>
      </div>
      {children}
    </div>
  );
}

/**
 * The honest "no records here" state. `unconfigured` means this environment
 * has no Supabase at all; it never substitutes fabricated data (RULES.md
 * sec.3 rule 19).
 */
function UnconfiguredState() {
  return (
    <PageShell>
      <EmptyState
        iconName="file-off"
        heading="School records aren't available here"
        sub="This environment has no connection to the records store, so schools can't be added."
      />
    </PageShell>
  );
}

/**
 * Configured but errored. Distinct from `unconfigured` on purpose: this one
 * is worth retrying, and saying so is the difference between a coordinator
 * waiting and a coordinator filing a ticket.
 */
function SyncFailedState() {
  return (
    <PageShell>
      <EmptyState
        iconName="refresh"
        heading="Couldn't load the school registry"
        sub="Adding a school isn't available right now. Try again in a moment."
        action={
          <Link href="/schools/new" className="btn primary" style={{ marginTop: 12 }}>
            Retry
          </Link>
        }
      />
    </PageShell>
  );
}

export default async function NewSchoolPage() {
  const clerkUserId = await getAuthUserId();
  if (!clerkUserId) {
    return (
      <PageShell>
        <EmptyState
          iconName="shield-off"
          heading="Sign in to manage schools"
          sub="You need to be signed in as the platform operator for this workspace."
          action={
            <Link href="/sign-in" className="btn primary" style={{ marginTop: 12 }}>
              Sign in
            </Link>
          }
        />
      </PageShell>
    );
  }

  const platform = await getPlatformAdminSnapshot();
  if (platform.status === 'unconfigured') return <UnconfiguredState />;
  if (platform.status === 'sync-failed') return <SyncFailedState />;

  // Deliberately NOT gated on `resolveRouteRole`, which honours a `?role=`
  // preview override — this screen must not be previewable into existence.
  // It is not gated on `resolveTrustedRole` either: platform admin is a
  // different axis from the tenant-scoped `profile_role`, and holding
  // 'admin' at some school grants nothing here. RLS would still refuse the
  // write; the gate exists so a non-operator gets an explanation instead of
  // a form whose only outcome is a denial.
  if (!platform.isPlatformAdmin) {
    return (
      <PageShell>
        <EmptyState
          iconName="shield-off"
          heading="Only the platform operator can add schools"
          sub="Schools are set up on request. Ask the operator who administers this workspace to add yours."
        />
      </PageShell>
    );
  }

  const qualifications = await listQualifications();
  if (qualifications.status === 'unconfigured') return <UnconfiguredState />;
  if (qualifications.status === 'sync-failed') return <SyncFailedState />;

  // A school must record at least one registered program, so an empty
  // qualifications registry makes the form unsubmittable. Say that plainly
  // rather than render a select with nothing in it.
  if (qualifications.qualifications.length === 0) {
    return (
      <PageShell>
        <EmptyState
          iconName="certificate"
          heading="No qualifications are registered yet"
          sub="A school records the programs it is registered to deliver, so the qualifications list has to be populated first."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p className="user-form-intro">
        Register a TVI and the qualifications its Certificate of Program
        Registration covers. Once it is added, give someone at the school
        access to it.
      </p>
      <CreateSchoolForm
        action={createSchoolAction}
        qualifications={qualifications.qualifications.map((qualification) => ({
          id: qualification.id,
          label: qualification.label,
        }))}
      />
    </PageShell>
  );
}
