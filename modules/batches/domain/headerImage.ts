/**
 * Which qualification header image a batch shows — pure, no I/O.
 *
 * A batch reaches its national qualification two ways:
 *   1. `batches.tenant_qualification_id` → `tenant_qualifications.qualification_id`
 *      (the real link, but nullable and rarely set yet), then
 *   2. `batches.qualification_title` matched against `qualifications.title`
 *      (the display title every batch carries).
 * The link wins when present. No match means no image, and the hero falls
 * back to its neutral header.
 */

export interface QualificationImageIndex {
  /** qualification id → storage path */
  byQualificationId: Map<string, string>;
  /** normalized title → storage path */
  byTitle: Map<string, string>;
  /** tenant_qualifications id → qualification id */
  tenantQualificationToQualification: Map<string, string>;
}

export function normalizeQualificationTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function pickHeaderImagePath(
  batch: { tenantQualificationId: string | null; qualificationTitle: string },
  index: QualificationImageIndex,
): string | null {
  const linked = batch.tenantQualificationId
    ? index.tenantQualificationToQualification.get(batch.tenantQualificationId)
    : undefined;
  if (linked) return index.byQualificationId.get(linked) ?? null;
  return index.byTitle.get(normalizeQualificationTitle(batch.qualificationTitle)) ?? null;
}
