import { describe, expect, it } from 'vitest';
import {
  QUALIFICATION_IMAGE_MAX_BYTES,
  buildQualificationImagePath,
  checkImageDimensions,
  checkImageFile,
} from '@/modules/tenancy/domain/qualificationImage';
import { normalizeQualificationTitle, pickHeaderImagePath } from '@/modules/batches/domain/headerImage';

describe('checkImageFile', () => {
  it('accepts jpeg/png/webp within the size limit', () => {
    expect(checkImageFile({ mimeType: 'image/webp', size: 1000 })).toEqual({ ok: true, type: 'image/webp' });
  });
  it('rejects empty, wrong type and oversize files', () => {
    expect(checkImageFile({ mimeType: 'image/png', size: 0 })).toEqual({ ok: false, reason: 'missing' });
    expect(checkImageFile({ mimeType: 'image/gif', size: 10 })).toEqual({ ok: false, reason: 'type' });
    expect(checkImageFile({ mimeType: 'image/png', size: QUALIFICATION_IMAGE_MAX_BYTES + 1 })).toEqual({ ok: false, reason: 'size' });
  });
});

describe('checkImageDimensions', () => {
  it('accepts 1600x900 with no warnings', () => {
    expect(checkImageDimensions(1600, 900)).toEqual({ ok: true, warnings: [] });
  });
  it('rejects portrait and square', () => {
    expect(checkImageDimensions(900, 1600)).toEqual({ ok: false, reason: 'portrait' });
    expect(checkImageDimensions(1000, 1000)).toEqual({ ok: false, reason: 'portrait' });
  });
  it('warns on non-16:9 and low resolution landscape', () => {
    expect(checkImageDimensions(1200, 900)).toEqual({ ok: true, warnings: ['not-16-9', 'low-resolution'] });
  });
});

describe('buildQualificationImagePath', () => {
  it('builds {id}/{token}.{ext}', () => {
    expect(buildQualificationImagePath('abc-123', 'image/jpeg', 'tok')).toBe('abc-123/tok.jpg');
  });
  it('refuses separators or traversal in either segment', () => {
    expect(buildQualificationImagePath('../x', 'image/png', 'tok')).toBeNull();
    expect(buildQualificationImagePath('abc', 'image/png', 'a/b')).toBeNull();
  });
});

describe('pickHeaderImagePath', () => {
  const index = {
    byQualificationId: new Map([['q-rice', 'q-rice/a.jpg']]),
    byTitle: new Map([['agricultural crops production nc ii', 'q-acp/b.jpg']]),
    tenantQualificationToQualification: new Map([['tq-1', 'q-rice'], ['tq-2', 'q-none']]),
  };
  it('prefers the tenant_qualification link', () => {
    expect(pickHeaderImagePath({ tenantQualificationId: 'tq-1', qualificationTitle: 'Agricultural Crops Production NC II' }, index)).toBe('q-rice/a.jpg');
  });
  it('a linked qualification without an image does not fall back to the title', () => {
    expect(pickHeaderImagePath({ tenantQualificationId: 'tq-2', qualificationTitle: 'Agricultural Crops Production NC II' }, index)).toBeNull();
  });
  it('falls back to a normalized title match', () => {
    expect(pickHeaderImagePath({ tenantQualificationId: null, qualificationTitle: '  Agricultural  Crops Production NC II ' }, index)).toBe('q-acp/b.jpg');
  });
  it('returns null for an unknown qualification', () => {
    expect(pickHeaderImagePath({ tenantQualificationId: null, qualificationTitle: 'Cookery NC II' }, index)).toBeNull();
  });
  it('normalizes case and whitespace', () => {
    expect(normalizeQualificationTitle(' Rice  Machinery ')).toBe('rice machinery');
  });
});
