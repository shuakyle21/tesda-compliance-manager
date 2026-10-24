import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UrgencyIndicator } from '@/shared/ui/UrgencyIndicator';
import { MetricCard } from '@/shared/ui/MetricCard';
import { TableView } from '@/modules/batches/ui/TableView';
import type { Batch } from '@/shared/types';

// Rendered output, not just domain values: these are the spots the live
// walkthrough (2026-10-24) caught printing "✓ Infinity DAYS".

function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('UrgencyIndicator', () => {
  it('renders the no-deadline sentinel as "not recorded", never as a countdown', () => {
    const html = renderToStaticMarkup(createElement(UrgencyIndicator, { days: Number.POSITIVE_INFINITY, variant: 'badge' }));
    expect(text(html)).toBe('NOT RECORDED');
    expect(html).not.toContain('Infinity');
  });

  it('renders a past deadline as overdue and zero as today', () => {
    expect(text(renderToStaticMarkup(createElement(UrgencyIndicator, { days: -313 })))).toBe('313D OVERDUE');
    expect(text(renderToStaticMarkup(createElement(UrgencyIndicator, { days: 0 })))).toBe('TODAY');
  });
});

describe('MetricCard', () => {
  it('pairs a severity variant with a status glyph beside the text (not color alone)', () => {
    const html = renderToStaticMarkup(createElement(MetricCard, {
      label: 'Needs attention', value: 3, sub: 'Coming due or needs a record', variant: 'warning', ariaLabel: 'Needs attention: 3.',
    }));
    // The glyph lives in a non-shrinking wrapper next to the wrapping text span.
    expect(html).toMatch(/flex-shrink:0[^>]*><svg/);
    expect(text(html)).toContain('Coming due or needs a record');
    expect(html).toContain('aria-label="Needs attention: 3."');
  });

  it('adds no glyph to a neutral card', () => {
    const html = renderToStaticMarkup(createElement(MetricCard, { label: 'Active batches', value: 2, sub: '39 scholars enrolled' }));
    expect(html).not.toMatch(/flex-shrink:0[^>]*><svg/);
  });
});

describe('TableView row', () => {
  const batch = {
    id: 'DEV-NEN-001', tenantId: 't', programId: 'p', name: 'DEV-NEN-001 (Batch 1)', qualification: 'Rice Machinery Operations NC II',
    program: 'CFSP', ncLevel: 'NC II', trainer: 'A Trainer', trainerId: 'tr', scholars: 17,
    trainingDays: '', trainingDaySchedule: [], notes: '', trainingStart: '2026-05-05', trainingEnd: '2026-07-10', duration: 0,
    completedSessions: null, totalSessions: 45, currentDay: 0, totalDays: 45, progressPct: 81, ntpLag: null, tipDate: '',
    billingDeadline: null, daysToBilling: Number.POSITIVE_INFINITY, bsrs: false, remark: '',
    status: 'ongoing', blocked: false, lifecycle: [], documents: {}, documentRequirements: [],
  } satisfies Batch;

  it('shows "Not recorded" for both progress and billing when neither has a source', () => {
    const rendered = text(renderToStaticMarkup(createElement(TableView, { batches: [{ ...batch, progressPct: 40 }] })));
    expect(rendered).toContain('Not recorded');
    expect(rendered).toContain('NOT RECORDED');
    expect(rendered).not.toContain('Infinity');
    expect(rendered).not.toContain('40%'); // the hand-typed progress_percent is never drawn
  });
});
