/**
 * Billing derivation layer (FR-09).
 *
 * Billing has no table of its own yet — it is *derived* from a batch plus the
 * document matrix and the tenant record. This layer owns that derivation so the
 * route stays a thin fetch-and-compose shell and the UI receives ready-to-render
 * cards. It reads the mock reference datasets (document requirements, tenants)
 * from `shared/mocks`; when the real `billing_records` table lands (ADR-001 §11)
 * a Supabase fetch slots in here behind the same return shape.
 */

import { DOCUMENT_REQUIREMENTS, TENANTS } from '@/shared/mocks';
import type { Batch, DocumentRequirement, Tenant } from '@/shared/types';
import { billingGate, type BillingGate, type DocReadiness } from '@/modules/billing/domain/readiness';
import { tracksForProgram, type BillingTrack, isCfsp } from '@/modules/billing/domain/tracks';
import type { StatementTenant } from '@/modules/billing/domain/statement';

export interface BillingCard {
  /** Full batch — the preview modal builds each track's statement from it. */
  batch: Batch;
  program: string;
  isCfsp: boolean;
  qualification: string;
  progressPct: number;
  gate: BillingGate;
  tracks: BillingTrack[];
  tenant: StatementTenant;
}

/**
 * Document stages that gate a billing tranche (ADR-001 §Ready / §LL1): the
 * *supporting* evidence that must be in place before billing — attendance,
 * master list, training schedule, TIP/NTP/AOU. The billing-stage outputs
 * themselves (BSRS slip, Billing Report) and the Assessment CoR are deliberately
 * excluded: requiring them would make billing-readiness circular (an ongoing
 * batch could never qualify).
 */
const SUPPORTING_DOC_STAGES = new Set(['aou', 'ntp', 'tip', 'train']);

/**
 * Supporting-document readiness for a batch: how many of the *critical
 * supporting* documents (see {@link SUPPORTING_DOC_STAGES}) are on file. A
 * document counts as on file when it is `verified` OR `submitted` — ADR-001
 * §7.2.4 accepts uploaded manual daily attendance sheets as legitimate billing
 * evidence, so a submitted (uploaded) supporting doc satisfies the gate; only
 * `missing` / `pending` items hold it back. A batch with no document records
 * (e.g. a live row before the documents join lands) reads as 0 → gate closed.
 */
const ON_FILE_STATUSES = new Set(['verified', 'submitted']);

export function deriveDocReadiness(
  batch: Batch,
  requirements: DocumentRequirement[] = DOCUMENT_REQUIREMENTS,
): DocReadiness {
  const supporting = requirements.filter((r) => r.critical && SUPPORTING_DOC_STAGES.has(r.stage));
  const verified = supporting.filter((r) => ON_FILE_STATUSES.has(batch.documents[r.key]?.status ?? '')).length;
  return { verified, requiredTotal: supporting.length };
}

/** Resolve the school context the statement header needs from the tenant record. */
export function resolveTenant(tenantId: string, tenants: Tenant[] = TENANTS): StatementTenant {
  const t = tenants.find((x) => x.id === tenantId);
  return { name: t?.name ?? tenantId, region: t?.region ?? '' };
}

/** Build one billing card (gate + tracks + tenant context) for a batch. */
export function buildBillingCard(batch: Batch): BillingCard {
  const docs = deriveDocReadiness(batch);
  return {
    batch,
    program: batch.program,
    isCfsp: isCfsp(batch.program),
    qualification: batch.qualification,
    progressPct: batch.progressPct,
    gate: billingGate(batch, docs),
    tracks: tracksForProgram(batch.program),
    tenant: resolveTenant(batch.tenantId),
  };
}

/**
 * Build the billing cards for a set of batches, most-ready first (ready batches,
 * then by progress). Only active batches are billable; completed cohorts drop
 * out (their billing is historical).
 */
export function buildBillingCards(batches: Batch[]): BillingCard[] {
  return batches
    .filter((b) => b.status !== 'completed')
    .map(buildBillingCard)
    .sort((a, b) => {
      if (a.gate.ready !== b.gate.ready) return a.gate.ready ? -1 : 1;
      return b.progressPct - a.progressPct;
    });
}
