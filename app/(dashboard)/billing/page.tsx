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
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { firstParam, resolveRouteRole } from '@/modules/auth/data/role';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import { buildPackets } from '@/modules/billing/domain/packets';
import { buildBillingCards } from '@/modules/billing/data/billing';
import { BillingQueueView } from '@/modules/billing/ui/BillingQueueView';
import type { Batch, DocumentRequirement } from '@/shared/types';

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

  // Real role/tenant identity (Phase 1 of the live-data cutover): fetched
  // here, not inside resolveRouteRole, because a module's data/ is private
  // to it — role.ts (auth) can't import tenancy.ts (tenancy) directly, so
  // this app/ route fetches both and passes the result down. `null` when
  // unsigned-in, not-found (no profiles row yet), or Supabase isn't
  // configured — resolveRouteRole falls through to its other sources.
  const clerkUserId = await getAuthUserId();
  const profileSnapshot = clerkUserId ? await getProfileSnapshot(clerkUserId) : null;
  const dbRole = profileSnapshot?.status === 'ok' ? profileSnapshot.profile.role : null;

  const role = await resolveRouteRole(params, dbRole);

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

  // `unconfigured`/`sync-failed` render empty rather than substituting mock
  // data; `sync-failed` additionally surfaces the banner below (module
  // data-layer contract). An `ok` snapshot is authoritative even when
  // empty — see ADR-005 §5.
  const batches: Batch[] = selectBatchesForDisplay(snapshot);

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

  // No live source exists yet for either the per-tenant school-code map or a
  // per-program document-requirement catalog (the latter needs a program id
  // that `Batch` doesn't carry — TES-34-adjacent gap). Both degrade safely:
  // `buildPackets` prints "—" for an unresolved school code, and an empty
  // requirements catalog reads as "not yet verified", never as "ready" (see
  // packets.ts's `requirementsUnavailable` guard and readiness.ts's
  // `requiredTotal > 0` guard) — so this never fabricates a passing gate.
  const schoolCodes: Record<string, string> = {};
  const documentRequirements: DocumentRequirement[] = [];
  const packets = buildPackets(visible, documentRequirements, schoolCodes);

  // Statement-preview inputs: one card per active batch (gate + tracks + tenant
  // header context). The queue row is the ADR-003 projection; the card is what
  // `buildStatement` derives the actual document from — same batches, two views.
  const cards = buildBillingCards(visible, documentRequirements);

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
