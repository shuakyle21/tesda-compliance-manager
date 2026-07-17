/**
 * SCREEN ROUTE — Billing (FR-09, ADR-001)
 *
 * Thin server shell: resolve role (trainers are server-DENIED billing per the
 * load-bearing role rule — redirected away, not CSS-hidden), fetch the batch
 * snapshot, derive billing cards, and hand them to the BillingView island.
 *
 * Role/state preview overrides (`?role=` / `?state=`) mirror the dashboard route
 * until the real tenant/role resolver lands (TES-34).
 */

import { redirect } from 'next/navigation';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MOCK_BATCHES } from '@/shared/mocks';
import { getBatchesSnapshot } from '@/modules/batches/data/batches';
import { getCurrentUser } from '@/modules/auth/data/auth';
import { buildBillingCards } from '@/modules/billing/data/billing';
import { BillingView } from '@/modules/billing/ui/BillingView';
import type { UserRole } from '@/shared/types';

type BillingRole = Extract<UserRole, 'admin' | 'coordinator' | 'viewer'>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DATA_STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h
const DATA_AS_OF_FALLBACK = 'cached snapshot';

function formatDataStamp(date: Date): string {
  const d = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const t = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${d} · ${t}`;
}

function isDataStale(asOf: Date | null): boolean {
  return asOf ? Date.now() - asOf.getTime() > DATA_STALE_AFTER_MS : false;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.toLowerCase() ?? null;
  return value?.toLowerCase() ?? null;
}

function isBillingRole(role: string | null): role is BillingRole {
  return role === 'admin' || role === 'coordinator' || role === 'viewer';
}

async function resolveBillingRole(params: Awaited<SearchParams>): Promise<BillingRole | 'trainer' | null> {
  const queryRole = firstParam(params.role);
  if (isBillingRole(queryRole) || queryRole === 'trainer') return queryRole;

  const user = await getCurrentUser().catch(() => null);
  const metadataRole = typeof user?.publicMetadata?.role === 'string'
    ? user.publicMetadata.role.toLowerCase()
    : null;

  if (isBillingRole(metadataRole) || metadataRole === 'trainer') return metadataRole;
  return null;
}

export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const role = await resolveBillingRole(params);

  // Trainers never see billing (ADR-001 §9 + the trainer-DTO omission rule).
  if (role === 'trainer') redirect('/trainer');

  // Least-privilege fallback until the resolver lands (TES-34): unresolved → viewer.
  const billingRole = role ?? 'viewer';
  const readOnly = billingRole === 'viewer';

  const forcedState = firstParam(params.state);

  // Access-denied preview (real role/tenant denial is blocked on TES-34).
  if (forcedState === 'denied') {
    return (
      <div>
        <div className="page-head"><h1>Billing</h1></div>
        <EmptyState
          iconName="shield-off"
          heading="Access denied"
          sub="Your role does not have access to this school's billing. Contact a coordinator to request access."
        />
      </div>
    );
  }

  const snapshot = await getBatchesSnapshot();
  const mockScoped = billingRole === 'viewer'
    ? MOCK_BATCHES
    : MOCK_BATCHES.filter((batch) => billingRole === 'coordinator' || batch.tenantId === 'tnt_j3ed');
  const batches = snapshot.status === 'ok' ? snapshot.batches : mockScoped;

  const cards = forcedState === 'empty' ? [] : buildBillingCards(batches);

  const dataAsOfDate = snapshot.status === 'ok' && snapshot.dataAsOf ? new Date(snapshot.dataAsOf) : null;
  const dataAsOfLabel = dataAsOfDate ? formatDataStamp(dataAsOfDate) : DATA_AS_OF_FALLBACK;
  const stale = forcedState === 'stale' || isDataStale(dataAsOfDate);
  const syncFailed = forcedState === 'sync-failed' || snapshot.status === 'sync-failed';

  return (
    <BillingView
      cards={cards}
      readOnly={readOnly}
      dataAsOfLabel={dataAsOfLabel}
      stale={stale}
      syncFailed={syncFailed}
    />
  );
}
