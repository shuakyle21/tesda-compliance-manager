import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import {
  applyOverviewFilters, crossSchoolQueue, overviewFilterOptions, parseOverviewFilters, schoolSummaries,
} from '@/modules/batches/domain/overview';
import { SchoolsOverview } from '@/modules/batches/ui/overview/SchoolsOverview';
import type { Batch, DocRecord, DocumentRequirement, LifecycleStage } from '@/shared/types';

// The rendered overview, composed exactly as `app/(dashboard)/overview/page.tsx`
// composes it, over fixed fixtures. Guards the copy contract: totals state
// their population, no-source figures never print a zero, and no section
// disagrees with the filtered set.

const SCHOOLS = [
  { tenantId: 'akb', code: 'AKB', name: 'AKB Technical School' },
  { tenantId: 'nen', code: 'NEN', name: 'Nenita Farm School' },
  { tenantId: 'j3', code: 'J3ED', name: 'J3ed Farm School' },
];
const REQS: DocumentRequirement[] = [
  { key: 'ntp', label: 'Notice to Proceed', stage: 'ntp', critical: true, icon: 'file' },
  { key: 'tip', label: 'TIP Report', stage: 'tip', critical: true, icon: 'file' },
];
const STAGES: [LifecycleStage['key'], string][] = [
  ['aou', 'AOU'], ['ntp', 'NTP'], ['tip', 'TIP'], ['train', 'Training'], ['entre', 'ENTRE'], ['assess', 'Assessment'], ['bill', 'Billing'],
];

function lifecycle(active: LifecycleStage['key'] | null): LifecycleStage[] {
  const at = STAGES.findIndex(([key]) => key === active);
  return STAGES.map(([key, label], i) => ({ key, label, date: '', status: at < 0 ? 'pending' : i < at ? 'done' : i === at ? 'active' : 'pending' }));
}
function doc(status: DocRecord['status']): DocRecord {
  return { status, url: null, updated: null, source: null };
}
function batch(overrides: Partial<Batch>): Batch {
  return {
    id: 'BAT-1', rqmCode: null, tenantId: 'akb', programId: 'p', name: 'BAT-1',
    qualification: 'Organic Agriculture Production NC II', program: 'TWSP', ncLevel: 'NC II',
    trainer: '', trainerId: '', scholars: 25, trainingDays: '', trainingDaySchedule: [], notes: '',
    trainingStart: '2026-09-01', trainingEnd: '2026-12-18', duration: 0,
    completedSessions: null, totalSessions: null, currentDay: 0, totalDays: 0, progressPct: 0, ntpLag: null, tipDate: '',
    billingDeadline: null, daysToBilling: Number.POSITIVE_INFINITY, bsrs: false, remark: '',
    status: 'ongoing', blocked: false, lifecycle: lifecycle('train'), documents: {}, documentRequirements: REQS,
    ...overrides,
  };
}

const BATCHES: Batch[] = [
  batch({ id: 'BAT-1', tenantId: 'akb', billingDeadline: '2026-11-08', daysToBilling: -5, completedSessions: 30, totalSessions: 40, documents: { ntp: doc('verified'), tip: doc('missing') } }),
  batch({ id: 'BAT-2', tenantId: 'akb', program: 'CFSP', qualification: 'Rice Machinery Operations NC II', scholars: 20, trainingEnd: '2026-11-01', lifecycle: lifecycle('assess'), billingDeadline: '2026-11-25', daysToBilling: 12, documents: { ntp: doc('verified'), tip: doc('submitted') } }),
  batch({ id: 'BAT-4', tenantId: 'nen', scholars: 18, blocked: true, status: 'pending', lifecycle: lifecycle(null) }),
  batch({ id: 'BAT-3', tenantId: 'nen', program: 'CFSP', qualification: 'Rice Machinery Operations NC II', scholars: 22, completedSessions: 10, totalSessions: 40, billingDeadline: '2027-02-10', daysToBilling: 89, documents: { ntp: doc('pending') } }),
  batch({ id: 'BAT-9', tenantId: 'j3', status: 'completed', bsrs: true, lifecycle: lifecycle(null) }),
];

type Activity = Parameters<typeof SchoolsOverview>[0]['activity'];

function render(params: Record<string, string>, batches = BATCHES, activity?: Activity): string {
  const options = overviewFilterOptions(batches, SCHOOLS);
  const filters = parseOverviewFilters(params, options);
  const inView = applyOverviewFilters(batches, SCHOOLS, filters);
  const summaries = schoolSummaries(inView.batches, inView.schools, '2026-11-13');
  return renderToStaticMarkup(createElement(SchoolsOverview, {
    summaries, queue: crossSchoolQueue(summaries), metrics: deriveDashboardMetrics(inView.batches), batches: inView.batches,
    filters, options, hiddenSchools: inView.hiddenSchools, fetchedAt: '2026-11-13T02:15:00.000Z', activity,
  }));
}
function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('SchoolsOverview', () => {
  it('states the population of every total and keeps billing per school', () => {
    const html = render({});
    const out = text(html);
    expect(out).toContain('3 schools you manage');
    expect(out).toContain('Data as of');
    // 3 ongoing batches (the blocked one is not active), 25 + 20 + 22 scholars.
    expect(html).toContain('aria-label="Active batches: 3. 67 scholars enrolled · across 3 schools."');
    expect(html).toContain('aria-label="Managed schools: 3. 2 with active batches."');
    expect(out).not.toContain('Next billing due: ');
    expect(out).toContain('Urgent · AKB Technical School');
    expect(out).toContain('Urgent · Nenita Farm School');
  });

  it('never prints a zero for a figure with no source', () => {
    const out = text(render({ school: 'j3ed' }));
    expect(out).toContain('Attendance not recorded');
    expect(out).toContain('Not tracked');
    expect(out).not.toContain('NaN');
    expect(out).not.toContain('Infinity');
  });

  it('applies one filter to every section and says how many schools it hid', () => {
    const out = text(render({ program: 'cfsp' }));
    expect(out).toContain('across 2 schools');
    expect(out).toContain('1 school has no batches matching these filters.');
    expect(out).toContain('Clear filters');
    expect(out).not.toContain('BAT-1 billing overdue');
  });

  it('shows the no-results state instead of zeroed totals', () => {
    const out = text(render({ school: 'j3ed', program: 'cfsp' }));
    expect(out).toContain('No batches match these filters');
    expect(out).not.toContain('Active batches');
  });

  it('shows the empty state and still lists the schools when no batch exists', () => {
    const out = text(render({}, []));
    expect(out).toContain('No batches yet');
    expect(out).toContain('Nenita Farm School');
  });

  it('says a selected school has no batches yet, not that the filters matched nothing', () => {
    const out = text(render({ school: 'j3ed' }, BATCHES.filter((b) => b.tenantId !== 'j3')));
    expect(out).toContain('No batches yet');
    expect(out).not.toContain('No batches match these filters');
    expect(out).toContain('J3ed Farm School');
  });

  it('shows a failed activity read as a failure, never as a missing section', () => {
    expect(text(render({ school: 'akb' }, BATCHES, 'failed'))).toContain('Recent activity for this school could not be loaded');
    expect(text(render({ school: 'akb' }, BATCHES, { events: [], href: '/t/akb/activity-log' }))).toContain('No recent activity yet');
    expect(text(render({ school: 'akb' }))).not.toContain('Recent activity');
  });

  it('never implies official approval or certification', () => {
    expect(text(render({})).toLowerCase()).not.toMatch(/certified|approved by|submitted to tesda/);
  });
});
