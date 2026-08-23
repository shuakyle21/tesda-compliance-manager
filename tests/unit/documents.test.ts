import { describe, it, expect } from 'vitest';
import { mapRequirementRow, mapDocumentRow } from '@/modules/documents/data/documents';
import type { Database } from '@/lib/supabase/database.types';

type RequirementRow = Database['public']['Tables']['program_document_requirements']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];

function fixtureRequirementRow(overrides: Partial<RequirementRow> = {}): RequirementRow {
  return {
    id: 'req-1',
    program_id: 'program-1',
    document_key: 'aou',
    document_name: 'Authority to Operate',
    description: null,
    required_for_stage: 'aou',
    audience: 'all',
    is_required: true,
    sort_order: 10,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function fixtureDocumentRow(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: 'doc-1',
    tenant_id: 'tenant-1',
    batch_id: 'batch-1',
    requirement_id: 'req-1',
    document_key: 'aou',
    document_name: 'Authority to Operate',
    status: 'verified',
    audience: 'all',
    storage_path: null,
    external_url: null,
    notes: null,
    submitted_by: null,
    submitted_at: null,
    verified_by: null,
    verified_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mapRequirementRow', () => {
  it('maps a known document_key to its dedicated icon', () => {
    const req = mapRequirementRow(fixtureRequirementRow({ document_key: 'billing_report' }));
    expect(req.icon).toBe('receipt');
  });

  it('falls back to the default icon for an unrecognized document_key', () => {
    const req = mapRequirementRow(fixtureRequirementRow({ document_key: 'some_future_key' }));
    expect(req.icon).toBe('file');
  });

  it('bridges the DB lifecycle stage to the UI stage string', () => {
    const req = mapRequirementRow(fixtureRequirementRow({ required_for_stage: 'training' }));
    expect(req.stage).toBe('train');
  });

  it('maps a null required_for_stage to an empty stage', () => {
    const req = mapRequirementRow(fixtureRequirementRow({ required_for_stage: null }));
    expect(req.stage).toBe('');
  });
});

describe('mapDocumentRow', () => {
  it('prefers verified_at over submitted_at and updated_at for the "updated" timestamp', () => {
    const row = fixtureDocumentRow({
      verified_at: '2026-03-03T00:00:00.000Z',
      submitted_at: '2026-02-02T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(mapDocumentRow(row).updated).toBe('2026-03-03T00:00:00.000Z');
  });

  it('falls back to submitted_at when there is no verification', () => {
    const row = fixtureDocumentRow({
      verified_at: null,
      submitted_at: '2026-02-02T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(mapDocumentRow(row).updated).toBe('2026-02-02T00:00:00.000Z');
  });

  it('falls back to updated_at when neither verification nor submission happened', () => {
    const row = fixtureDocumentRow({ verified_at: null, submitted_at: null, updated_at: '2026-01-01T00:00:00.000Z' });
    expect(mapDocumentRow(row).updated).toBe('2026-01-01T00:00:00.000Z');
  });

  it('labels a stored file as "Uploaded file"', () => {
    const row = fixtureDocumentRow({ storage_path: 'tenant-1/batch-1/aou.pdf', external_url: null });
    expect(mapDocumentRow(row).source).toBe('Uploaded file');
    expect(mapDocumentRow(row).url).toBe('tenant-1/batch-1/aou.pdf');
  });

  it('labels an external link as "External link" when there is no stored file', () => {
    const row = fixtureDocumentRow({ storage_path: null, external_url: 'https://example.com/aou.pdf' });
    expect(mapDocumentRow(row).source).toBe('External link');
    expect(mapDocumentRow(row).url).toBe('https://example.com/aou.pdf');
  });

  it('has no source and no url when neither a file nor a link exists', () => {
    const row = fixtureDocumentRow({ storage_path: null, external_url: null });
    expect(mapDocumentRow(row).source).toBeNull();
    expect(mapDocumentRow(row).url).toBeNull();
  });
});
