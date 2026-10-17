import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import { rosterBody } from '@/modules/batches/ui/BatchRosterSection';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import type { ScholarRow } from '@/shared/types';

function scholar(overrides: Partial<ScholarRow> = {}): ScholarRow {
  return {
    seq: 1,
    lastName: 'Cruz',
    firstName: 'Karina',
    middleInit: 'R.',
    extName: '',
    uli: 'ULI-0001',
    assessmentResult: 'Competent',
    sex: '', dob: '', age: 0, civilStatus: '', education: '', nationality: '',
    clientClass: '', scholarshipType: '', contact: '', email: '', trainingStatus: '',
    dateStarted: '', dateFinished: '', dateAssessed: '', empStatusBefore: '',
    employmentStatus: '', dateEmployed: '', occupation: '', employer: '',
    empClassification: '', salary: '',
    ...overrides,
  };
}

const settled = { isPending: false, isError: false };

/**
 * Recursively collects every text node in a rendered element tree, including
 * the `heading`/`sub` props that `EmptyState` renders its copy from rather
 * than passing as children.
 */
function textIn(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textIn).join('');

  const element = node as ReactElement<{ children?: unknown; heading?: string; sub?: string }>;
  if (!element.props) return '';

  return [element.props.heading, element.props.sub, textIn(element.props.children)]
    .filter(Boolean)
    .join(' ');
}

/**
 * Each of the six states a data screen must handle. The distinctions here are
 * operational, not cosmetic: a coordinator who reads "no scholars enrolled"
 * when the truth is "we could not reach the database" will act on a roster
 * that does not exist.
 */
describe('rosterBody states', () => {
  it('shows a loading state while the query is pending', () => {
    const tree = rosterBody({ data: undefined, isPending: true, isError: false });
    expect(textIn(tree)).toContain('Loading roster');
  });

  it('treats undefined data as still loading rather than as an empty roster', () => {
    const tree = rosterBody({ data: undefined, isPending: false, isError: false });
    expect(textIn(tree)).toContain('Loading roster');
  });

  it('warns on a sync failure instead of implying the batch has no scholars', () => {
    const tree = rosterBody({ data: undefined, isPending: false, isError: true });
    expect(tree.type).toBe(InfoCallout);
    expect(textIn(tree)).toContain('Sync with Supabase failed');
  });

  it('never puts a database message on screen', () => {
    const tree = rosterBody({ data: undefined, isPending: false, isError: true });
    const text = textIn(tree);
    expect(text).not.toContain('relation');
    expect(text).not.toContain('learners');
  });

  it('keeps showing the last good rows when a refresh fails, with a staleness warning', () => {
    // TanStack keeps `data` populated across an error, so a failed *background*
    // refetch arrives as isError with rows still in hand. Reachable in the
    // ordinary path: open a batch, close it, wait past staleTime, reopen, and
    // have the refetch hiccup. Those rows are the best answer available —
    // replacing a roster someone is reading with an error panel would discard
    // real information to report a transient problem.
    const tree = rosterBody({
      data: { status: 'ok', learners: [scholar()] },
      isPending: false,
      isError: true,
    });

    const text = textIn(tree);
    expect(text).toContain('Cruz, Karina R.');
    expect(text).toContain('may be out of date');
  });

  it('says the roster is unavailable when Supabase is unconfigured', () => {
    const tree = rosterBody({ data: { status: 'unconfigured' }, ...settled });
    expect(tree.type).toBe(EmptyState);
    expect(textIn(tree)).not.toContain('No scholars enrolled');
  });

  it('renders the mandated no-tenant-access screen, not an ordinary empty state', () => {
    // These two must never be confused: "you are attached to no school" is a
    // statement about the account, "no scholars enrolled" about the batch.
    const tree = rosterBody({ data: { status: 'no-tenant-access' }, ...settled });
    expect(tree.type).toBe(NoTenantAccessState);
    expect(tree.type).not.toBe(EmptyState);
  });

  it('shows an honest empty state when the batch genuinely has no learners', () => {
    const tree = rosterBody({ data: { status: 'ok', learners: [] }, ...settled });
    expect(tree.type).toBe(EmptyState);
    expect(textIn(tree)).toContain('No scholars enrolled');
  });

  it('lists scholars with sequence, name and assessment result', () => {
    const tree = rosterBody({
      data: {
        status: 'ok',
        learners: [scholar(), scholar({ seq: 2, lastName: 'Diaz', firstName: 'Noel' })],
      },
      ...settled,
    });

    const text = textIn(tree);
    expect(text).toContain('Cruz, Karina R.');
    expect(text).toContain('Diaz, Noel R.');
    expect(text).toContain('ULI-0001');
    expect(text).toContain('Competent');
  });

  it('omits the assessment column for a scholar who has not been assessed', () => {
    // `mapLearnerRow` maps the `pending` result to an empty string precisely so
    // the UI can say nothing rather than assert a result that does not exist.
    const tree = rosterBody({
      data: { status: 'ok', learners: [scholar({ assessmentResult: '' })] },
      ...settled,
    });
    expect(textIn(tree)).not.toContain('Competent');
  });
});
