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

import { EmptyState } from '@/shared/ui/EmptyState';
import { SnapshotStatusNotice } from '@/shared/ui/SnapshotStatusNotice';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { firstParam, resolveRouteRole, toOfficeRole } from '@/modules/auth/data/role';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { buildPackets } from '@/modules/billing/domain/packets';
import { buildBillingCards } from '@/modules/billing/data/billing';
import { BillingQueueView } from '@/modules/billing/ui/BillingQueueView';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { formatDateTime } from '@/shared/dates';
import { requireOfficeScope } from '../../../../tenant-scope';
import type { Batch, DocumentRequirement } from '@/shared/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BillingPage({ params: routeParams, searchParams }: { params: Promise<{ tenantCode: string }>; searchParams: SearchParams }) {
  // One school, validated against the caller's memberships by the segment layout.
  // Scope + trainer redirect (ADR-001 §9): trainers never reach billing data.
  const resolved = await requireOfficeScope(routeParams);
  if (!resolved) return null;
  const { scope, profile } = resolved;
  const params = await searchParams;

  // Presentation only, past this point — `?role=` may still change how
  // BillingQueueView renders (e.g. previewing the coordinator/viewer variant)
  // but never gates the redirect above. Least-privilege fallback until the
  // tenant/role resolver lands (TES-34): an unresolved or non-office role
  // (including a previewed 'trainer', which BillingQueueView has no variant
  // for) renders read-only rather than write-enabled.
  const billingRole = toOfficeRole(await resolveRouteRole(params, profile.role));

  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure.
  const snapshot = withTenantAccess(await getBatchesSnapshot(scope.tenantId), tenantAccessOf(profile));
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

  // "Data as of" is when this snapshot was read, the same stamp the dashboard
  // shows. Null (rendered as "not available") when there is no ok snapshot,
  // never a stand-in time.
  const dataAsOf = snapshot.status === 'ok' ? formatDateTime(snapshot.fetchedAt) : null;

  if (packets.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Billing</h1>
        </div>
        <SnapshotStatusNotice
          status={syncFailed ? 'sync-failed' : snapshot.status}
          hasRows={false}
          subject="the billing queue"
          retryHref={scopedPath(scope.code, 'billing')}
          emptyFallback={
            <EmptyState
              iconName="file-off"
              heading="No batches to bill yet"
              sub="Packets appear here once a batch reaches training. Import a batch to get started."
            />
          }
        />
      </div>
    );
  }

  return (
    <BillingQueueView
      packets={packets}
      cards={cards}
      role={billingRole}
      dataAsOf={dataAsOf}
      syncFailed={syncFailed}
      stale={stale}
    />
  );
}
