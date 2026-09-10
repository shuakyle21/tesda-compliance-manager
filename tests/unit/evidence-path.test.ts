/**
 * TES-41 / FR-06 — evidence storage path construction and file validation.
 *
 * These are security tests, not formatting tests. The `compliance-evidence`
 * bucket authorizes every operation with
 * `app_private.can_access_tenant((storage.foldername(name))[1]::uuid)`, so the
 * **first path segment is the tenant check**. Any input that can introduce a
 * `/` shifts every segment and moves the object into a different tenant's
 * folder. The bulk of this file is therefore separator-injection coverage.
 */

import { describe, it, expect } from 'vitest';
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_REJECTION_COPY,
  buildEvidencePath,
  validateEvidenceFile,
  type EvidenceRejection,
} from '@/modules/documents/domain/evidencePath';

const TENANT = '3f8a1c22-5d4e-4b7a-9c11-0e2d6f7a8b90';
const BATCH = '7b2e9d40-1a63-4c58-8f22-5d3e1a9c4b77';
const KEY = 'ntp';
const FILE = 'ntp-signed.pdf';

/** Assert a rejection and narrow to its reason in one step. */
function reasonOf(result: { ok: boolean; reason?: EvidenceRejection }): EvidenceRejection {
  expect(result.ok).toBe(false);
  return result.reason as EvidenceRejection;
}

describe('buildEvidencePath — happy path', () => {
  it('produces exactly {tenant_id}/{batch_id}/{document_key}/{filename}', () => {
    const result = buildEvidencePath(TENANT, BATCH, KEY, FILE);
    expect(result).toEqual({ ok: true, path: `${TENANT}/${BATCH}/${KEY}/${FILE}` });
  });

  it('puts the tenant id in segment 1, which is what RLS reads', () => {
    const result = buildEvidencePath(TENANT, BATCH, KEY, FILE);
    if (!result.ok) throw new Error('expected ok');
    expect(result.path.split('/')[0]).toBe(TENANT);
    expect(result.path.split('/')).toHaveLength(4);
  });

  it('accepts an uppercase uuid', () => {
    expect(buildEvidencePath(TENANT.toUpperCase(), BATCH, KEY, FILE).ok).toBe(true);
  });

  it('accepts filenames with spaces, dots and unicode', () => {
    for (const name of ['NTP signed copy.pdf', 'report..final.pdf', 'ñtp-firmado.pdf']) {
      expect(buildEvidencePath(TENANT, BATCH, KEY, name).ok).toBe(true);
    }
  });
});

describe('buildEvidencePath — tenant-escape surface', () => {
  it('rejects a filename containing a forward slash (the actual escape)', () => {
    // Without this check the object key gains a fifth segment; a crafted name
    // like `../<other-tenant>/x.pdf` is how segment 1 stops being the tenant.
    expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, 'a/b.pdf'))).toBe('invalid-filename');
  });

  it('rejects a filename containing a backslash', () => {
    expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, 'a\\b.pdf'))).toBe('invalid-filename');
  });

  it('rejects the relative-path filenames . and ..', () => {
    expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, '.'))).toBe('invalid-filename');
    expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, '..'))).toBe('invalid-filename');
  });

  it('rejects percent-encoded separators', () => {
    // Some clients and CDNs decode these in transit, re-introducing the
    // separator after a naive check would already have passed.
    for (const name of ['a%2fb.pdf', 'a%2Fb.pdf', 'a%5cb.pdf', '%2e%2e/x.pdf']) {
      expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, name))).toBe('invalid-filename');
    }
  });

  it('rejects NUL and other control characters', () => {
    const names = ['a\u0000b.pdf', 'a\nb.pdf', 'a\u001fb.pdf', 'a\u007fb.pdf', 'a\u009fb.pdf'];
    for (const name of names) {
      expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, name))).toBe('invalid-filename');
    }
  });

  it('rejects an empty or whitespace-only filename', () => {
    for (const name of ['', '   ', '\t', ' lead.pdf', 'trail.pdf ']) {
      expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, name))).toBe('invalid-filename');
    }
  });

  it('rejects an over-long filename', () => {
    expect(reasonOf(buildEvidencePath(TENANT, BATCH, KEY, `${'a'.repeat(201)}.pdf`))).toBe(
      'invalid-filename',
    );
  });

  it('rejects a document_key containing a separator or uppercase', () => {
    for (const key of ['a/b', 'a\\b', '../x', 'NTP', 'ntp key', '']) {
      expect(reasonOf(buildEvidencePath(TENANT, BATCH, key, FILE))).toBe('invalid-document-key');
    }
  });

  it('rejects non-uuid tenant and batch ids', () => {
    for (const bad of ['', 'not-a-uuid', `${TENANT}/..`, `../${TENANT}`, '../../etc/passwd']) {
      expect(reasonOf(buildEvidencePath(bad, BATCH, KEY, FILE))).toBe('invalid-tenant-id');
      expect(reasonOf(buildEvidencePath(TENANT, bad, KEY, FILE))).toBe('invalid-batch-id');
    }
  });

  it('checks the tenant id first, so the reason is never misleading', () => {
    // Everything is wrong at once; the caller should hear about the outermost
    // problem rather than an arbitrary one.
    expect(reasonOf(buildEvidencePath('bad', 'bad', 'BAD', 'a/b'))).toBe('invalid-tenant-id');
  });
});

describe('validateEvidenceFile', () => {
  const pdf = 'application/pdf';

  it('accepts a file exactly at the limit', () => {
    expect(validateEvidenceFile({ size: EVIDENCE_MAX_BYTES, mimeType: pdf })).toEqual({ ok: true });
  });

  it('accepts a file just under the limit', () => {
    expect(validateEvidenceFile({ size: EVIDENCE_MAX_BYTES - 1, mimeType: pdf }).ok).toBe(true);
  });

  it('rejects a file one byte over the limit', () => {
    expect(reasonOf(validateEvidenceFile({ size: EVIDENCE_MAX_BYTES + 1, mimeType: pdf }))).toBe(
      'file-too-large',
    );
  });

  it('matches the bucket file_size_limit declared in the migration', () => {
    // The canonical migration sets file_size_limit = 52428800. If these ever
    // diverge the client accepts uploads Storage will silently refuse.
    expect(EVIDENCE_MAX_BYTES).toBe(52428800);
  });

  it('rejects empty, negative and non-finite sizes', () => {
    for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(reasonOf(validateEvidenceFile({ size, mimeType: pdf }))).toBe('empty-file');
    }
  });

  it('rejects a disallowed MIME type', () => {
    for (const mimeType of ['application/x-msdownload', 'text/html', 'application/zip', '']) {
      expect(reasonOf(validateEvidenceFile({ size: 1024, mimeType }))).toBe(
        'unsupported-file-type',
      );
    }
  });

  it('normalises MIME parameters and case before matching', () => {
    expect(validateEvidenceFile({ size: 1024, mimeType: 'application/pdf; charset=binary' }).ok).toBe(
      true,
    );
    expect(validateEvidenceFile({ size: 1024, mimeType: 'APPLICATION/PDF' }).ok).toBe(true);
    expect(validateEvidenceFile({ size: 1024, mimeType: '  image/png  ' }).ok).toBe(true);
  });

  it('accepts every declared allowed type', () => {
    for (const mimeType of ALLOWED_EVIDENCE_MIME_TYPES) {
      expect(validateEvidenceFile({ size: 1024, mimeType }).ok).toBe(true);
    }
  });

  it('checks size before type, so an oversized file is not blamed on its format', () => {
    expect(
      reasonOf(validateEvidenceFile({ size: EVIDENCE_MAX_BYTES + 1, mimeType: 'text/html' })),
    ).toBe('file-too-large');
  });
});

describe('EVIDENCE_REJECTION_COPY', () => {
  it('covers every rejection reason', () => {
    const reasons: EvidenceRejection[] = [
      'invalid-tenant-id',
      'invalid-batch-id',
      'invalid-document-key',
      'invalid-filename',
      'file-too-large',
      'empty-file',
      'unsupported-file-type',
    ];
    for (const reason of reasons) {
      expect(EVIDENCE_REJECTION_COPY[reason]).toBeTruthy();
    }
  });

  it('leaks no identifiers, table names or emoji to the user (design system)', () => {
    for (const copy of Object.values(EVIDENCE_REJECTION_COPY)) {
      expect(copy).not.toMatch(/document_key|tenant_id|batch_id|storage\.objects|compliance-evidence/);
      expect(copy).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-➿]/u);
    }
  });
});
