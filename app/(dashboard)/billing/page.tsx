/**
 * SCREEN ROUTE — Billing packet queue + statement engine (FR-09).
 *
 * Figma reference: file vZKyWXSipBHmiQFuHl5e1O, node 840:5128.
 * Domain reference: ADR-003 (packet-queue projection amending ADR-001 §4);
 * ADR-001 §V2/§W1 (statement preview as the document-generating surface).
 *
 * Server Component: resolves the role, fetches the batch snapshot, projects
 * packets through the billing domain, derives the per-batch billing cards the
 * statement preview consumes, and composes the client island. No business
 * logic lives here — projection is `modules/billing/domain`, card derivation
 * is `modules/billing/data`.
 */

import { redirect } from 'next/navigation';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MOCK_BATCHES } from '@/shared/mocks';
import { DOCUMENT_REQUIREMENTS, TENANTS } from '@/shared/mocks/seed';
import { getBatchesSnapshot } from '@/modules/batches/data/batches';
import { firstParam, resolveRouteRole } from '@/modules/auth/data/role';
import { buildPackets } from '@/modules/billing/domain/packets';
import { buildBillingCards } from '@/modules/billing/data/billing';
import { BillingQueueView } from '@/modules/billing/ui/BillingQueueView';
import type { Batch } from '@/shared/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DATA_AS_OF_FALLBACK = '29 May 2026, 09:12';

function formatAsOf(value: string | null): string {
  if (!value) return DATA_AS_OF_FALLBACK;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DATA_AS_OF_FALLBACK;
  return date.toLocaleString('en-PH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const role = await resolveRouteRole(params);

  // Trainer DTOs must omit billing entirely — server-denied, never CSS-hidden
  // (ADR-001 §9 Scope, and the load-bearing role rule in CLAUDE.md).
  if (role === 'trainer') {
    redirect('/trainer');
  }

  // Least-privilege fallback until the tenant/role resolver lands (TES-34):
  // an unresolved role renders read-only rather than write-enabled.
  const billingRole = role ?? 'viewer';

  const snapshot = await getBatchesSnapshot();
  const forcedState = firstParam(params.state);

  // `unconfigured` falls back to the seed dataset silently; `sync-failed` is a
  // real failure and must surface the banner (module data-layer contract).
  const batches: Batch[] =
    snapshot.status === 'ok' && snapshot.batches.length > 0 ? snapshot.batches : MOCK_BATCHES;

  const syncFailed = snapshot.status === 'sync-failed' || forcedState === 'sync-failed';
  const stale = forcedState === 'stale';

  if (forcedState === 'denied') {
    return (
      <div className="page">
        <EmptyState
          iconName="shield-off"
          heading="You do not have access to billing"
          sub="Billing figures are limited to coordinators and admins for this school. Contact a coordinator to request access."
        />
      </div>
    );
  }

  const visible = forcedState === 'empty' ? [] : batches;

  const schoolCodes = Object.fromEntries(TENANTS.map((t) => [t.id, t.code]));
  const packets = buildPackets(visible, DOCUMENT_REQUIREMENTS, schoolCodes);

  // Statement-preview inputs: one card per active batch (gate + tracks + tenant
  // header context). The queue row is the ADR-003 projection; the card is what
  // `buildStatement` derives the actual document from — same batches, two views.
  const cards = buildBillingCards(visible);

  const latestUpdate = visible
    .map((b) => b.updatedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1) ?? null;

  if (packets.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Billing</h1>
        </div>
        <EmptyState
          iconName="file-off"
          heading="No batches to bill yet"
          sub="Packets appear here once a batch reaches training. Import a batch to get started."
        />
      </div>
    );
  }

  return (
    <BillingQueueView
      packets={packets}
      cards={cards}
      role={billingRole}
      dataAsOf={formatAsOf(latestUpdate)}
      syncFailed={syncFailed}
      stale={stale}
    />
  );
}
