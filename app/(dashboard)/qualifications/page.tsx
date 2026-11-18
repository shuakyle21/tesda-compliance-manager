/**
 * SCREEN ROUTE — Qualification header images (platform operator).
 *
 * Each national qualification can carry one landscape image, shown at the top
 * of the batch detail view for every batch of that qualification. Gated like
 * `/schools/new`: platform admin only, never previewable via `?role=`. RLS on
 * the table and bucket remains the boundary.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { getPlatformAdminSnapshot } from '@/modules/tenancy/data/platform';
import { listQualificationImages } from '@/modules/tenancy/data/qualificationImages';
import { QualificationImageManager } from '@/modules/tenancy/ui/QualificationImageManager';
import { qualificationImageAction } from './actions';

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Qualification images</h1>
      </div>
      {children}
    </div>
  );
}

function SyncFailedState() {
  return (
    <PageShell>
      <EmptyState
        iconName="refresh"
        heading="Couldn't load the qualifications list"
        sub="Header images can't be managed right now. Try again in a moment."
        action={
          <Link href="/qualifications" className="btn primary" style={{ marginTop: 12 }}>
            Retry
          </Link>
        }
      />
    </PageShell>
  );
}

export default async function QualificationImagesPage() {
  if (!(await getAuthUserId())) {
    return (
      <PageShell>
        <EmptyState
          iconName="shield-off"
          heading="Sign in to manage qualification images"
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
  if (platform.status === 'unconfigured') {
    return (
      <PageShell>
        <EmptyState
          iconName="file-off"
          heading="Qualification records aren't available here"
          sub="This environment has no connection to the records store, so images can't be managed."
        />
      </PageShell>
    );
  }
  if (platform.status === 'sync-failed') return <SyncFailedState />;
  if (!platform.isPlatformAdmin) {
    return (
      <PageShell>
        <EmptyState
          iconName="shield-off"
          heading="Only the platform operator can manage qualification images"
          sub="Header images are shared by every school, so they are set by the operator who administers this workspace."
        />
      </PageShell>
    );
  }

  const snapshot = await listQualificationImages();
  if (snapshot.status === 'unconfigured') return <SyncFailedState />;
  if (snapshot.status === 'sync-failed') {
    console.error('QualificationImagesPage: list failed', snapshot.error);
    return <SyncFailedState />;
  }
  if (snapshot.qualifications.length === 0) {
    return (
      <PageShell>
        <EmptyState
          iconName="certificate"
          heading="No qualifications are registered yet"
          sub="Add qualifications to the national registry first, then give each one a header image."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p className="user-form-intro">
        Give each qualification a landscape photo of its hands-on work. It appears at the top of
        every batch of that qualification, at every school. Use JPEG, PNG or WebP, 16:9, at least
        1600 × 900, up to 5 MB.
      </p>
      <QualificationImageManager qualifications={snapshot.qualifications} action={qualificationImageAction} />
    </PageShell>
  );
}
