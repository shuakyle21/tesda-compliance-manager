/**
 * School registration rules (FR-02, ADR-006).
 *
 * These tests pin the decisions in `domain/schoolDraft.ts` that are easy to
 * "tidy up" into something wrong later, and whose failure modes are quiet:
 *
 *   1. A blank COPR number must stay valid. Schools are routinely entered
 *      while the certificate is still being issued, and requiring it would
 *      make the operator invent a number — corrupting the field it was added
 *      to record.
 *   2. A duplicate qualification must be caught here, not by the database.
 *      The unique constraint on (tenant_id, qualification_id) would reject
 *      the whole transaction with a message nobody at a desk can act on.
 *   3. Zero programs must be rejected. A school with no registered program
 *      cannot run a batch, so saving one is a data-entry mistake rather than
 *      a valid intermediate state.
 *   4. The school code must normalize to capitals. `tenants.code` is unique
 *      and shown as the school's short name, so `akb` alongside `AKB` would
 *      create two schools that read as one — and the unique constraint would
 *      not catch it.
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeSchoolCode,
  validateSchoolDraft,
  type SchoolDraft,
  type SchoolProgramDraft,
} from '@/modules/tenancy/domain/schoolDraft';

const QUAL_A = 'qual_organic_agri';
const QUAL_B = 'qual_welding';
const ALLOWED = [QUAL_A, QUAL_B];

function program(overrides: Partial<SchoolProgramDraft> = {}): SchoolProgramDraft {
  return {
    qualificationId: QUAL_A,
    coprNumber: '20221263AFFOAP212009-R',
    registrationStatus: 'Registered',
    deliveryMode: 'Institution-Based Training (IBT)',
    ...overrides,
  };
}

function draft(overrides: Partial<SchoolDraft> = {}): SchoolDraft {
  return {
    code: 'J3ED',
    name: 'J3ED Farm School',
    region: 'Region IV-A, Quezon',
    schoolType: 'Farm school',
    tesdaProviderCode: '1263',
    province: 'Quezon',
    cityMunicipality: 'Candelaria',
    streetAddress: 'Purok 3, Barangay Malabanban Norte',
    providerType: 'Private',
    providerClassification: 'TVIs',
    programs: [program()],
    ...overrides,
  };
}

describe('normalizeSchoolCode', () => {
  it('uppercases and strips whitespace so one school cannot be entered twice', () => {
    expect(normalizeSchoolCode(' j3 ed ')).toBe('J3ED');
  });
});

describe('validateSchoolDraft', () => {
  it('accepts a complete draft and passes every field through to the command', () => {
    const result = validateSchoolDraft(draft(), ALLOWED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.command.code).toBe('J3ED');
    expect(result.command.name).toBe('J3ED Farm School');
    expect(result.command.tesdaProviderCode).toBe('1263');
    expect(result.command.providerClassification).toBe('TVIs');
    expect(result.command.programs).toHaveLength(1);
    expect(result.command.programs[0].coprNumber).toBe('20221263AFFOAP212009-R');
  });

  it('accepts a program whose certificate has not been issued yet', () => {
    const result = validateSchoolDraft(
      draft({ programs: [program({ coprNumber: '' })] }),
      ALLOWED,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Empty becomes null, never '' — one representation of "not recorded".
    expect(result.command.programs[0].coprNumber).toBeNull();
  });

  it('rejects a blank school name', () => {
    const result = validateSchoolDraft(draft({ name: '   ' }), ALLOWED);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.name).toBeTruthy();
  });

  it('rejects a school code with spaces or punctuation', () => {
    const result = validateSchoolDraft(draft({ code: 'J3-ED FARM' }), ALLOWED);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.code).toBeTruthy();
  });

  it('rejects a non-numeric TESDA provider code', () => {
    const result = validateSchoolDraft(draft({ tesdaProviderCode: 'RQM3' }), ALLOWED);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.tesdaProviderCode).toBeTruthy();
  });

  it('rejects a school with no registered programs', () => {
    const result = validateSchoolDraft(draft({ programs: [] }), ALLOWED);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.programs).toBeTruthy();
  });

  it('treats a wholly blank program row as an untouched spare, not an error', () => {
    const blank: SchoolProgramDraft = {
      qualificationId: '',
      coprNumber: '',
      registrationStatus: '',
      deliveryMode: '',
    };
    const result = validateSchoolDraft(draft({ programs: [program(), blank] }), ALLOWED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command.programs).toHaveLength(1);
  });

  it('rejects a partially filled row that names no qualification', () => {
    const result = validateSchoolDraft(
      draft({ programs: [program({ qualificationId: '', coprNumber: 'ABC-1' })] }),
      ALLOWED,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.programRows?.[0]).toBeTruthy();
  });

  it('catches a duplicate qualification before the database has to', () => {
    const result = validateSchoolDraft(
      draft({ programs: [program(), program()] }),
      ALLOWED,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Flagged against the second row — where the operator can see it.
    expect(result.errors.programRows?.[1]).toBeTruthy();
    expect(result.errors.programRows?.[0]).toBeUndefined();
  });

  it('allows two different qualifications at the same school', () => {
    const result = validateSchoolDraft(
      draft({ programs: [program(), program({ qualificationId: QUAL_B })] }),
      ALLOWED,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command.programs).toHaveLength(2);
  });

  it('rejects a qualification that is not on offer, rather than letting the FK fail', () => {
    const result = validateSchoolDraft(
      draft({ programs: [program({ qualificationId: 'qual_not_real' })] }),
      ALLOWED,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.programRows?.[0]).toBeTruthy();
  });

  it('leaves every optional field null rather than empty string', () => {
    const result = validateSchoolDraft(
      draft({
        region: '',
        schoolType: '',
        tesdaProviderCode: '',
        province: '',
        cityMunicipality: '',
        streetAddress: '',
        providerType: '',
        providerClassification: '',
      }),
      ALLOWED,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command.region).toBeNull();
    expect(result.command.province).toBeNull();
    expect(result.command.providerType).toBeNull();
    expect(result.command.tesdaProviderCode).toBeNull();
  });

  it('ignores non-string input instead of throwing on it', () => {
    const result = validateSchoolDraft(
      draft({ name: undefined, code: 42 }),
      ALLOWED,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.code).toBeTruthy();
  });
});
