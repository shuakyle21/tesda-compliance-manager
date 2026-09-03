import { DOCUMENT_REQUIREMENTS, TENANTS } from '@/shared/mocks';
import type { Batch, DocumentRequirement, Tenant } from '@/shared/types';
import { billingGate, type BillingGate, type DocReadiness } from '@/modules/billing/domain/readiness';
import { isDocOnFile } from '@/modules/documents/domain/compliance';
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
 * Derive the supporting-document readiness for a batch.
 *
 * Supporting-document readiness for a batch: how many of the *critical
 * supporting* documents (see {@link SUPPORTING_DOC_STAGES}) are on file. A
 * document counts as on file when it is `verified` OR `submitted` — ADR-001
 * §7.2.4 accepts uploaded manual daily attendance sheets as legitimate billing
 * evidence, so a submitted (uploaded) supporting doc satisfies the gate; only
 * `missing` / `pending` items hold it back.
 *
 * Untracked documents (no record on the batch at all) count as **not on file**
 * — ADR-004's gating rule, the deliberate opposite of its measurement rule: a
 * readiness gate must never open on evidence nobody has recorded. So the
 * denominator stays the full supporting set and an untracked batch reads 0 →
 * gate closed.
 *
 * @param batch - The batch to check for document readiness
 * @param requirements - The document requirement catalog (defaults to mock requirements)
 * @returns Document readiness with verified count and required total
 */
export function deriveDocReadiness(
  batch: Batch,
  requirements: DocumentRequirement[] = DOCUMENT_REQUIREMENTS,
): DocReadiness {
  const supporting = requirements.filter((r) => r.critical && SUPPORTING_DOC_STAGES.has(r.stage));
  const verified = supporting.filter((r) => isDocOnFile(batch, r.key)).length;
  return { verified, requiredTotal: supporting.length };
}

/**
 * Resolve the school context (name and region) needed for billing statement headers.
 *
 * @param tenantId - The tenant ID to look up
 * @param tenants - The tenant list to search (defaults to mock tenants)
 * @returns Statement tenant context with name and region
 */
export function resolveTenant(tenantId: string, tenants: Tenant[] = TENANTS): StatementTenant {
  const t = tenants.find((x) => x.id === tenantId);
  return { name: t?.name ?? tenantId, region: t?.region ?? '' };
}

/**
 * Build one billing card containing gate status, applicable tracks, and tenant context.
 *
 * @param batch - The batch to build a billing card for
 * @returns Complete billing card with readiness gate, tracks, and tenant info
 */
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
 * Build billing cards for a set of batches, sorted by readiness and progress.
 *
 * Only active batches are included — completed cohorts drop out since their
 * billing is historical. Cards are sorted with ready batches first, then by
 * descending progress percentage.
 *
 * @param batches - The batches to build billing cards for
 * @returns Array of billing cards sorted by readiness and progress
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
