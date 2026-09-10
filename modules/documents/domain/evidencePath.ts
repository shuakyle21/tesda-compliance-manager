/**
 * Evidence storage-path construction and file validation (TES-41, FR-06).
 *
 * Pure domain logic, no I/O — the I/O half lives in
 * `modules/documents/data/evidence.ts`.
 *
 * ## Why this file is a security boundary, not string formatting
 *
 * The `compliance-evidence` bucket's RLS policies in
 * `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql` authorize
 * every read, insert and update with:
 *
 * ```sql
 * app_private.can_access_tenant((storage.foldername(name))[1]::uuid)
 * ```
 *
 * **The first path segment IS the tenant authorization check.** Postgres splits
 * the object name on `/` and hands segment 1 to the membership function. So a
 * `filename` that contains a `/` does not produce a weirdly-named file — it
 * shifts every segment left and relocates the object into a path whose first
 * segment is no longer the tenant id the caller was scoped to. Rejecting
 * separators is therefore load-bearing, and is the reason every input is
 * validated rather than merely interpolated.
 *
 * RLS remains the boundary (CLAUDE.md): this validation is defence in depth on
 * the *shape of the key we hand Postgres*, not a substitute for the policy. A
 * malformed path that slipped through would still be denied — but it would be
 * denied for the wrong reason, and an escape into a tenant the caller happens
 * to also belong to would not be denied at all.
 *
 * ## Why every function returns a result instead of throwing
 *
 * FR-06 requires the UI to distinguish *invalid type*, *upload rejected* and
 * *upload failed* as separate states (#7). A thrown error collapses those into
 * one opaque failure, so each entry point returns a discriminated result whose
 * `reason` maps to a specific piece of user-facing copy. This mirrors the
 * snapshot pattern the data layers already use (`BatchesSnapshot` in
 * `modules/batches/data/batches.ts`).
 */

/**
 * Maximum evidence file size, in bytes (50 MiB).
 *
 * Declared here **once** and imported by both client and server validation.
 * The bucket itself enforces the same number (`file_size_limit` = `52428800`
 * in the canonical migration); this constant must stay in step with it. Do not
 * restate the literal anywhere else — a client that believes in a larger limit
 * produces uploads the bucket silently rejects.
 */
export const EVIDENCE_MAX_BYTES = 52_428_800;

/**
 * MIME types accepted as compliance evidence.
 *
 * Deliberately narrow: evidence is scanned paperwork and office documents, and
 * a compliance archive is a poor place to accept arbitrary binaries. Extending
 * this set is a product decision, not a bug fix.
 */
export const ALLOWED_EVIDENCE_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

/**
 * Why a path or file was rejected. Each member maps to one piece of UI copy —
 * see FR-06's required states — so callers never render a raw error string.
 */
export type EvidenceRejection =
  | 'invalid-tenant-id'
  | 'invalid-batch-id'
  | 'invalid-document-key'
  | 'invalid-filename'
  | 'file-too-large'
  | 'empty-file'
  | 'unsupported-file-type';

export type EvidencePathResult =
  | { ok: true; path: string }
  | { ok: false; reason: EvidenceRejection };

export type EvidenceFileResult =
  | { ok: true }
  | { ok: false; reason: EvidenceRejection };

/**
 * Canonical UUID v1–v8 form, lowercase or uppercase.
 *
 * Anchored at both ends so a value like `"<uuid>/../other"` cannot pass: the
 * ids are cast to `uuid` by the RLS policy, but they are interpolated into the
 * object key *before* Postgres ever sees them, so they are as much a
 * separator-injection surface as the filename is.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `document_key` is per-program configured data, not a closed enum (see the
 * note on `DOCUMENT_ICONS` in `modules/documents/data/documents.ts`), so this
 * validates *shape* rather than membership: lowercase alphanumerics, plus
 * `_` and `-`. That covers the eight keys the migration seeds and any future
 * key an admin configures, while excluding every path separator.
 */
const DOCUMENT_KEY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Characters that must never appear in a filename we hand to Storage.
 *
 * `/` and `\` are segment separators. C0/C1 control characters (which includes
 * NUL) are rejected because they are invisible in every UI that would later
 * display the name, making a malicious name indistinguishable from a benign
 * one on inspection.
 */
const UNSAFE_FILENAME_CHARS_RE = /[/\\\x00-\x1f\x7f-\x9f]/;

/** Maximum filename length, chosen to stay well inside Storage's key limit. */
const MAX_FILENAME_LENGTH = 200;

/**
 * True when `filename` is safe to use as the final path segment.
 *
 * Rejects, in order: empty/whitespace-only names; names containing a separator
 * or control character; the relative-path names `.` and `..`; percent-encoded
 * separators (`%2f`, `%5c`) — which some storage clients and CDNs decode on the
 * way through, re-introducing the separator after this check would have passed;
 * and over-long names.
 *
 * Note `..` is rejected only as a *whole* name. A filename like
 * `report..final.pdf` is harmless once separators are excluded, and rejecting
 * it would surprise users with ordinary documents.
 */
function isSafeFilename(filename: string): boolean {
  if (filename !== filename.trim()) return false;
  if (filename.length === 0 || filename.length > MAX_FILENAME_LENGTH) return false;
  if (filename === '.' || filename === '..') return false;
  if (UNSAFE_FILENAME_CHARS_RE.test(filename)) return false;
  if (/%2e%2e|%2f|%5c/i.test(filename)) return false;
  return true;
}

/**
 * Build the Storage object key for one piece of evidence.
 *
 * Shape: `{tenant_id}/{batch_id}/{document_key}/{filename}` — fixed by FR-06
 * and, more importantly, by the RLS policy that reads segment 1 as the tenant.
 *
 * Returns a result rather than throwing so the caller can map `reason` onto the
 * matching FR-06 error state.
 */
export function buildEvidencePath(
  tenantId: string,
  batchId: string,
  documentKey: string,
  filename: string,
): EvidencePathResult {
  if (!UUID_RE.test(tenantId)) return { ok: false, reason: 'invalid-tenant-id' };
  if (!UUID_RE.test(batchId)) return { ok: false, reason: 'invalid-batch-id' };
  if (!DOCUMENT_KEY_RE.test(documentKey)) return { ok: false, reason: 'invalid-document-key' };
  if (!isSafeFilename(filename)) return { ok: false, reason: 'invalid-filename' };

  return { ok: true, path: `${tenantId}/${batchId}/${documentKey}/${filename}` };
}

/**
 * Validate a candidate evidence file before any bytes are sent.
 *
 * Runs on both sides: in the browser so the user learns immediately, and again
 * on the server because a client-side check is a courtesy, not a control.
 *
 * `size` is compared inclusively against {@link EVIDENCE_MAX_BYTES} — a file of
 * exactly the limit is accepted, matching how the bucket's own
 * `file_size_limit` behaves.
 */
export function validateEvidenceFile(file: {
  size: number;
  mimeType: string;
}): EvidenceFileResult {
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, reason: 'empty-file' };
  if (file.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'file-too-large' };

  // Content-Type may arrive with parameters (`application/pdf; charset=binary`)
  // and with inconsistent case; normalise before the membership test.
  const mime = file.mimeType.split(';')[0]!.trim().toLowerCase();
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(mime)) {
    return { ok: false, reason: 'unsupported-file-type' };
  }

  return { ok: true };
}

/**
 * User-facing copy for each rejection.
 *
 * Lives here so every surface says the same thing. Per the design system, no
 * emoji, no raw identifiers, and no internal table or column names — a
 * coordinator sees what to do next, not what the database called the problem.
 */
export const EVIDENCE_REJECTION_COPY: Record<EvidenceRejection, string> = {
  'invalid-tenant-id': 'This workspace could not be identified. Reload the page and try again.',
  'invalid-batch-id': 'This batch could not be identified. Reload the page and try again.',
  'invalid-document-key': 'This requirement could not be identified. Reload the page and try again.',
  'invalid-filename':
    'Rename the file before uploading. File names cannot contain slashes or hidden characters.',
  'file-too-large': 'This file is larger than 50 MB. Upload a smaller or compressed copy.',
  'empty-file': 'This file is empty. Check the file and try again.',
  'unsupported-file-type':
    'This file type is not accepted. Upload a PDF, image, Word or Excel document.',
};
