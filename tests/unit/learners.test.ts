import { describe, it, expect } from 'vitest';
import { LEARNER_ROSTER_COLUMNS, mapLearnerRow } from '@/modules/batches/data/learners';

const columns = LEARNER_ROSTER_COLUMNS.split(',').map((c) => c.trim());

/**
 * This roster query runs in the browser, and Supabase RLS is row-level, not
 * column-level — nothing below the client stops an over-broad projection from
 * reaching a trainer's machine. `ScholarRow` already models salary, contact,
 * email and date of birth; the columns behind them arrive with TES-30. On the
 * day they do, a `select('*')` would start shipping them in a migration diff
 * that touches only SQL and so reads as unrelated to the UI.
 *
 * These assertions are the tripwire for that: they fail loudly in the pull
 * request that widens the projection, rather than silently in production.
 */
describe('LEARNER_ROSTER_COLUMNS', () => {
  it('requests only the columns the roster needs — mapper fields plus the sort key', () => {
    expect(columns).toEqual([
      // Selected for the order tiebreak and the list key, not for display.
      'id',
      'last_name',
      'first_name',
      'middle_name',
      'extension_name',
      'uli',
      'assessment_result',
    ]);
  });

  it('never selects every column', () => {
    expect(columns).not.toContain('*');
  });

  it.each(['salary', 'contact', 'email', 'dob', 'civil_status', 'tenant_id'])(
    'does not expose %s to the browser',
    (sensitive) => {
      expect(columns).not.toContain(sensitive);
    },
  );
});

describe('mapLearnerRow', () => {
  const row = {
    id: 'learner-1',
    last_name: 'Cruz',
    first_name: 'Karina',
    middle_name: 'Reyes',
    extension_name: null,
    uli: 'ULI-0001',
    assessment_result: 'competent' as const,
  };

  it('takes its sequence from the caller, not from the row', () => {
    // `learners` has no ordinal column, so `seq` is purely positional — it must
    // come from the already-ordered fetch result. Recomputing it per row would
    // let the roster renumber itself between identical queries.
    expect(mapLearnerRow(row, 4).seq).toBe(4);
  });

  it('reduces a middle name to a single initial with a period', () => {
    expect(mapLearnerRow(row, 1).middleInit).toBe('R.');
  });

  it('leaves the initial blank rather than inventing one when no middle name exists', () => {
    expect(mapLearnerRow({ ...row, middle_name: null }, 1).middleInit).toBe('');
  });

  it('translates every assessment result, with pending reading as not yet assessed', () => {
    expect(mapLearnerRow(row, 1).assessmentResult).toBe('Competent');
    expect(mapLearnerRow({ ...row, assessment_result: 'not_yet_competent' }, 1).assessmentResult)
      .toBe('Not Yet Competent');
    // Deliberately empty, not the word "Pending": no assessment has happened,
    // and labelling that as a status would assert a result that does not exist.
    expect(mapLearnerRow({ ...row, assessment_result: 'pending' }, 1).assessmentResult).toBe('');
  });

  it('defaults the columns the contract does not carry yet, rather than omitting them', () => {
    const scholar = mapLearnerRow({ ...row, uli: null }, 1);
    expect(scholar.uli).toBe('');
    expect(scholar.salary).toBe('');
    expect(scholar.employmentStatus).toBe('');
  });
});
