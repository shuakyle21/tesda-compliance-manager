/**
 * Qualification header images — Storage + registry I/O (migration 20261113120000).
 *
 * The rules (type, size, key shape) are `modules/tenancy/domain/qualificationImage.ts`.
 * Every call goes through the Clerk-scoped anon client, so RLS on
 * `qualifications` and on the private `qualification-images` bucket decides
 * who may write: platform admins only. Reads go through short-lived signed
 * URLs; there is no public URL.
 *
 * Raw Supabase errors are returned in `error` for server logs only, never for
 * rendering (RULES.md rule 6).
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  buildQualificationImagePath,
  checkImageFile,
  type QualificationImageRejection,
} from '@/modules/tenancy/domain/qualificationImage';

export const QUALIFICATION_IMAGE_BUCKET = 'qualification-images';
/** Long enough for an open page; short enough not to be a share link. */
export const QUALIFICATION_IMAGE_URL_TTL_SECONDS = 60 * 60;

const RLS_VIOLATION = '42501';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

export interface QualificationImageRow {
  id: string;
  code: string;
  title: string;
  ncLevel: string | null;
  sector: string | null;
  /** Signed URL of the current image, or null when none is set. */
  imageUrl: string | null;
}

export type QualificationImagesSnapshot =
  | { status: 'ok'; qualifications: QualificationImageRow[] }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/** Signs each distinct path once. A failed signing yields no URL, never an error. */
async function signPaths(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data } = await supabase.storage
    .from(QUALIFICATION_IMAGE_BUCKET)
    .createSignedUrls(unique, QUALIFICATION_IMAGE_URL_TTL_SECONDS);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

/** The registry with each qualification's current image, for the admin screen. */
export async function listQualificationImages(): Promise<QualificationImagesSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('qualifications')
      .select('id, code, title, nc_level, sector, header_image_path')
      .order('title', { ascending: true });
    if (error) return { status: 'sync-failed', error: error.message };

    const rows = data ?? [];
    const urls = await signPaths(
      supabase,
      rows.flatMap((r) => (r.header_image_path ? [r.header_image_path] : [])),
    );
    return {
      status: 'ok',
      qualifications: rows.map((r) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        ncLevel: r.nc_level,
        sector: r.sector,
        imageUrl: r.header_image_path ? urls.get(r.header_image_path) ?? null : null,
      })),
    };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}

export type QualificationImageWriteResult =
  | { status: 'ok' }
  | { status: 'rejected'; reason: QualificationImageRejection }
  | { status: 'denied' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

async function currentPath(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  qualificationId: string,
): Promise<{ ok: true; path: string | null } | { ok: false; result: QualificationImageWriteResult }> {
  const { data, error } = await supabase
    .from('qualifications')
    .select('header_image_path')
    .eq('id', qualificationId)
    .maybeSingle();
  if (error) return { ok: false, result: { status: 'sync-failed', error: error.message } };
  if (!data) return { ok: false, result: { status: 'denied' } };
  return { ok: true, path: data.header_image_path };
}

/**
 * Points the qualification at `path` and confirms the row changed. RLS turns a
 * non-admin update into zero affected rows, not an error, so the read-back is
 * what tells a denial from a success.
 */
async function setPath(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  qualificationId: string,
  path: string | null,
): Promise<QualificationImageWriteResult> {
  const { data, error } = await supabase
    .from('qualifications')
    .update({ header_image_path: path })
    .eq('id', qualificationId)
    .select('id');
  if (error) {
    return error.code === RLS_VIOLATION ? { status: 'denied' } : { status: 'sync-failed', error: error.message };
  }
  return data && data.length > 0 ? { status: 'ok' } : { status: 'denied' };
}

/**
 * Upload a new image, move the column to it, then delete the old object.
 * In that order so a failure at any step never leaves the column pointing at
 * a missing object; at worst an orphaned object remains.
 */
export async function replaceQualificationImage(input: {
  qualificationId: string;
  file: File;
}): Promise<QualificationImageWriteResult> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  const check = checkImageFile({ mimeType: input.file.type, size: input.file.size });
  if (!check.ok) return { status: 'rejected', reason: check.reason };

  const path = buildQualificationImagePath(input.qualificationId, check.type, crypto.randomUUID());
  if (!path) return { status: 'denied' };

  try {
    const supabase = await createSupabaseServerClient();
    const previous = await currentPath(supabase, input.qualificationId);
    if (!previous.ok) return previous.result;

    const { error: uploadError } = await supabase.storage
      .from(QUALIFICATION_IMAGE_BUCKET)
      .upload(path, input.file, { contentType: check.type, upsert: false });
    if (uploadError) {
      const denied = /row-level security|unauthorized|403/i.test(uploadError.message);
      return denied ? { status: 'denied' } : { status: 'sync-failed', error: uploadError.message };
    }

    const updated = await setPath(supabase, input.qualificationId, path);
    if (updated.status !== 'ok') {
      await supabase.storage.from(QUALIFICATION_IMAGE_BUCKET).remove([path]);
      return updated;
    }

    if (previous.path) await supabase.storage.from(QUALIFICATION_IMAGE_BUCKET).remove([previous.path]);
    return { status: 'ok' };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}

/** Clear the column, then delete the object. */
export async function removeQualificationImage(qualificationId: string): Promise<QualificationImageWriteResult> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };
  try {
    const supabase = await createSupabaseServerClient();
    const previous = await currentPath(supabase, qualificationId);
    if (!previous.ok) return previous.result;
    if (!previous.path) return { status: 'ok' };

    const updated = await setPath(supabase, qualificationId, null);
    if (updated.status !== 'ok') return updated;

    await supabase.storage.from(QUALIFICATION_IMAGE_BUCKET).remove([previous.path]);
    return { status: 'ok' };
  } catch (err) {
    return { status: 'sync-failed', error: errorMessage(err) };
  }
}
