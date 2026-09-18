/**
 * Evidence storage I/O (TES-41, FR-06) — the `compliance-evidence` bucket.
 *
 * The pure half (path construction, file validation, user-facing copy) lives in
 * `modules/documents/domain/evidencePath.ts`; this file is only the Supabase
 * Storage calls around it. Same split as `documents.ts`: rules in `domain/`,
 * I/O in `data/`.
 *
 * ## Authorization
 *
 * RLS is the boundary. The bucket's policies scope every operation with
 * `app_private.can_access_tenant((storage.foldername(name))[1]::uuid)`, so a
 * caller who is not a member of the tenant in segment 1 is refused by Postgres
 * regardless of what this file does. Nothing here filters by tenant in JS —
 * same contract as every other `data/` layer in the repo.
 *
 * The bucket is **private** (`public = false` in the canonical migration).
 * Every read therefore goes through a time-limited signed URL; there is no
 * public-URL path and one must not be added.
 *
 * ## ⚠️ Unverified as of 2026-09-10
 *
 * These functions are **written but not exercised**. Two dashboard toggles are
 * still unset (issue #122): Clerk's Supabase integration, and Supabase
 * Third-Party Auth. Until both are on, `createSupabaseServerClient` sends a
 * token Postgres will not accept, and every call here fails with an RLS denial
 * that is indistinguishable from a code defect. Do not debug this file against
 * a live project until #122 is closed.
 *
 * ## Known gap — evidence cannot be deleted by anyone
 *
 * `storage.objects` has select / insert / update policies for this bucket but
 * **no DELETE policy**, so deletion is refused for admins and coordinators too,
 * not just viewers. That is why this file exposes no `deleteEvidence`: shipping
 * one would produce a control that always fails. The fix is a policy gated on
 * `app_private.can_manage_tenant`, folded into the Phase 0.1 migration (#36).
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  buildEvidencePath,
  validateEvidenceFile,
  type EvidencePathResult,
  type EvidenceRejection,
} from '@/modules/documents/domain/evidencePath';

/** The bucket name, fixed by the canonical migration. */
const EVIDENCE_BUCKET = 'compliance-evidence';

/** Default signed-URL lifetime: long enough to open a document, short enough not to be a share link. */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Outcome of an upload attempt.
 *
 * `rejected` carries a {@link EvidenceRejection} the caller maps to copy via
 * `EVIDENCE_REJECTION_COPY`; it means "we never sent the bytes". `sync-failed`
 * means Storage itself refused or errored — a different FR-06 state ("upload
 * failed") with a different remedy.
 */
export type EvidenceUploadResult =
  | { status: 'ok'; path: string }
  | { status: 'rejected'; reason: EvidenceRejection }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

export type SignedUrlResult =
  | { status: 'ok'; url: string }
  | { status: 'rejected'; reason: EvidenceRejection }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/**
 * Generic message handed to the UI when Storage fails.
 *
 * Deliberately opaque: CLAUDE.md forbids leaking raw Supabase/SQL errors,
 * table names or internal ids to the UI. The real error is returned in `error`
 * for server-side logging, never for rendering.
 */
const UPLOAD_FAILED_MESSAGE = 'The file could not be uploaded. Try again.';

/**
 * The message to report for a value thrown out of the Storage client.
 *
 * Both calls below need this and must answer it the same way: a real `Error`
 * carries a message worth logging, anything else falls back to the opaque
 * text. Neither reaches the screen.
 */
function thrownMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : UPLOAD_FAILED_MESSAGE;
}

/**
 * Re-parse a stored object key back through the builder that produced it.
 *
 * The trailing segments are rejoined with `/` rather than taking the fourth
 * segment alone, and that is load-bearing. A key carrying more segments than
 * the canonical `{tenant}/{batch}/{key}/{filename}` shape reassembles into a
 * filename containing a separator, which `isSafeFilename` rejects. Reading
 * only the fourth segment would instead validate a *different*, shorter path
 * than the one the caller goes on to sign.
 */
function revalidateStoredPath(storagePath: string): EvidencePathResult {
  const [tenantId = '', batchId = '', documentKey = '', ...rest] = storagePath.split('/');
  return buildEvidencePath(tenantId, batchId, documentKey, rest.join('/'));
}

/**
 * Read the signing call's two-field reply as one outcome.
 *
 * Storage can fail in two ways here and both are failures: it reports an
 * error, or it reports none and still hands back no URL. Treating the second
 * as success would return `ok` with an empty link, so the absent URL is
 * checked alongside the error rather than after it.
 */
function signedUrlOutcome(
  data: { signedUrl?: string } | null,
  error: { message: string } | null,
): SignedUrlResult {
  if (error || !data?.signedUrl) {
    return { status: 'sync-failed', error: error?.message ?? UPLOAD_FAILED_MESSAGE };
  }
  return { status: 'ok', url: data.signedUrl };
}

/**
 * Upload one evidence file.
 *
 * Validates before sending — both the path shape and the file itself — so an
 * invalid request costs no network round trip and produces a specific reason
 * rather than a generic failure.
 *
 * `upsert` is deliberately `false`: re-submitting evidence for a requirement
 * should create a new object under a new filename and leave the prior one
 * intact. A compliance archive must not silently overwrite the document an
 * auditor may already have referenced.
 */
export async function uploadEvidence(input: {
  tenantId: string;
  batchId: string;
  documentKey: string;
  filename: string;
  body: ArrayBuffer | Blob;
  size: number;
  mimeType: string;
}): Promise<EvidenceUploadResult> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  const file = validateEvidenceFile({ size: input.size, mimeType: input.mimeType });
  if (!file.ok) return { status: 'rejected', reason: file.reason };

  const path = buildEvidencePath(
    input.tenantId,
    input.batchId,
    input.documentKey,
    input.filename,
  );
  if (!path.ok) return { status: 'rejected', reason: path.reason };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(path.path, input.body, { contentType: input.mimeType, upsert: false });

    if (error) return { status: 'sync-failed', error: error.message };
    return { status: 'ok', path: path.path };
  } catch (cause) {
    return { status: 'sync-failed', error: thrownMessage(cause) };
  }
}

/**
 * Mint a short-lived signed URL for one stored object.
 *
 * `storagePath` comes from `documents.storage_path`, which was written by
 * {@link uploadEvidence} and so is already well-formed. It is re-validated
 * anyway: the column is plain `text` with no constraint, and a row edited by
 * hand or by a future import path could carry anything.
 */
export async function getSignedEvidenceUrl(
  storagePath: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<SignedUrlResult> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  const revalidated = revalidateStoredPath(storagePath);
  if (!revalidated.ok) return { status: 'rejected', reason: revalidated.reason };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    return signedUrlOutcome(data, error);
  } catch (cause) {
    return { status: 'sync-failed', error: thrownMessage(cause) };
  }
}
