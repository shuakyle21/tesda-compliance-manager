/**
 * Qualification header image rules — pure, no I/O.
 *
 * One landscape image per national qualification, shown as the hero of the
 * batch detail view. The I/O half is `modules/tenancy/data/qualificationImages.ts`.
 *
 * The bucket itself (migration 20261113120000) enforces type and size, so
 * those checks here are for a specific message, not the boundary. Aspect ratio
 * needs the image's natural pixel size, which only the browser has after
 * decoding, so the form runs `checkImageDimensions` before submitting.
 */

export const QUALIFICATION_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type QualificationImageType = (typeof QUALIFICATION_IMAGE_TYPES)[number];

/** Mirrors the bucket's `file_size_limit`. */
export const QUALIFICATION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Recommended size; smaller is accepted with a warning. */
export const RECOMMENDED_WIDTH = 1600;
export const RECOMMENDED_HEIGHT = 900;

const EXTENSION: Record<QualificationImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type QualificationImageRejection = 'missing' | 'type' | 'size' | 'portrait';
export type QualificationImageWarning = 'not-16-9' | 'low-resolution';

export type FileCheck =
  | { ok: true; type: QualificationImageType }
  | { ok: false; reason: QualificationImageRejection };

function isAllowedType(mimeType: string): mimeType is QualificationImageType {
  return (QUALIFICATION_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/** Type and size — the checks the server can make without decoding the image. */
export function checkImageFile(input: { mimeType: string; size: number }): FileCheck {
  if (input.size <= 0) return { ok: false, reason: 'missing' };
  if (!isAllowedType(input.mimeType)) return { ok: false, reason: 'type' };
  if (input.size > QUALIFICATION_IMAGE_MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true, type: input.mimeType };
}

export type DimensionCheck =
  | { ok: true; warnings: QualificationImageWarning[] }
  | { ok: false; reason: 'portrait' };

/**
 * Portrait or square images are rejected: the hero crops to a wide strip and a
 * tall image loses most of its subject. Landscape images off 16:9 by more than
 * ~10% are accepted with a warning, because `object-fit: cover` crops them
 * rather than stretching.
 */
export function checkImageDimensions(width: number, height: number): DimensionCheck {
  if (!(width > height)) return { ok: false, reason: 'portrait' };
  const warnings: QualificationImageWarning[] = [];
  if (Math.abs(width / height - 16 / 9) / (16 / 9) > 0.1) warnings.push('not-16-9');
  if (width < RECOMMENDED_WIDTH || height < RECOMMENDED_HEIGHT) warnings.push('low-resolution');
  return { ok: true, warnings };
}

/** `{qualificationId}/{token}.{ext}` — a fresh key per upload, so a replace never overwrites in place. */
export function buildQualificationImagePath(
  qualificationId: string,
  type: QualificationImageType,
  token: string,
): string | null {
  const safe = /^[A-Za-z0-9-]+$/;
  if (!safe.test(qualificationId) || !safe.test(token)) return null;
  return `${qualificationId}/${token}.${EXTENSION[type]}`;
}

export const REJECTION_COPY: Record<QualificationImageRejection, string> = {
  missing: 'Choose an image to upload.',
  type: 'Use a JPEG, PNG or WebP image.',
  size: 'The image is larger than 5 MB. Export a smaller file and try again.',
  portrait: 'The image is portrait or square. Use a landscape image, ideally 16:9.',
};

export const WARNING_COPY: Record<QualificationImageWarning, string> = {
  'not-16-9': 'This image is not 16:9, so its edges will be cropped in the header.',
  'low-resolution': `This image is smaller than ${RECOMMENDED_WIDTH} × ${RECOMMENDED_HEIGHT} and may look soft on large screens.`,
};

export type QualificationImageFormState =
  | { status: 'idle' }
  | { status: 'saved'; qualificationId: string }
  | { status: 'removed'; qualificationId: string }
  | { status: 'rejected'; qualificationId: string; reason: QualificationImageRejection }
  | { status: 'denied' }
  | { status: 'unconfigured' }
  | { status: 'failed'; qualificationId?: string };

export const IDLE_QUALIFICATION_IMAGE_STATE: QualificationImageFormState = { status: 'idle' };

export type QualificationImageAction = (
  previous: QualificationImageFormState,
  formData: FormData,
) => Promise<QualificationImageFormState>;
