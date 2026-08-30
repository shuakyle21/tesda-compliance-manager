'use client';

/**
 * SCREEN — Analytics charts, rendered with Tremor.
 *
 * Deliberate exception to the rest of the app's design system (see the
 * analytics_tremor_decision project memory): Tremor's charts are rendered
 * as-is, not restyled to match design-system.css tokens. Scoped to this
 * module only via tremor.config.mjs's `content` globs — every other screen
 * is unaffected. Client Component because Tremor's charts render through
 * Recharts, which needs the browser.
 *
 * Same six charts as the previous hand-rolled SVG version (App.jsx
 * AnalyticsView port), now as Tremor chart types: BarList for ranked
 * percentages (training progress, document compliance), a stacked BarChart
 * for elapsed/remaining days, plain BarCharts for NTP lag and scholar
 * counts, and a DonutChart for the alerts-by-category breakdown.
 */

import { BarChart, BarList, DonutChart, Card, Title, Text, Grid, Col } from '@tremor/react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { criticalRequirements, summarizeBatchDocCompliance } from '@/modules/documents/domain/compliance';
import type { Batch, DocumentRequirement } from '@/shared/types';

export function AnalyticsView({
  batches,
  documentRequirements,
}: {
  batches: Batch[];
  documentRequirements: DocumentRequirement[];
}) {
  if (!batches.length) {
    return <EmptyState heading="No data to chart" sub="Import a CSV to populate analytics." />;
  }

  const progressData = batches
    .map((b) => ({ name: b.id, value: b.progressPct }))
    .sort((a, b) => b.value - a.value);

  const daysData = batches.map((b) => ({
    name: b.id,
    Elapsed: b.currentDay,
    Remaining: Math.max(b.totalDays - b.currentDay, 0),
  }));

  const ntpData = batches.map((b) => ({ name: b.id, 'NTP lag (days)': b.ntpLag }));

  // ADR-004: a batch that tracks none of the critical requirements is left out
  // of the ranking entirely — plotting it as 0% would read as a compliance
  // failure rather than an absence of data.
  const criticalReqs = criticalRequirements(documentRequirements);
  const docData = batches
    .map((b) => ({ name: b.id, summary: summarizeBatchDocCompliance(b, criticalReqs) }))
    .filter((d) => d.summary.verifiedPct !== null)
    .map((d) => ({ name: d.name, value: d.summary.verifiedPct as number }))
    .sort((a, b) => b.value - a.value);

  const scholarData = batches.map((b) => ({ name: b.id, Scholars: b.scholars }));
  const avgScholars = scholarData.reduce((s, r) => s + r.Scholars, 0) / scholarData.length;

  // Static demo counts — the original SVG version hardcoded the same figures;
  // a real alerts_log data contract (out of TES-30's current scope) would
  // replace this with a live category count.
  const alertsData = [
    { name: 'Billing critical', value: 8 },
    { name: 'Doc missing', value: 6 },
    { name: 'BSRS approved', value: 3 },
    { name: 'NTP lag', value: 2 },
    { name: 'Weekly digest', value: 4 },
  ];

  return (
    <Grid numItemsMd={2} className="gap-6">
      <Col>
        <Card>
          <Title>Training progress by batch</Title>
          <Text>% complete · descending</Text>
          <BarList data={progressData} valueFormatter={(v: number) => `${v}%`} color="blue" className="mt-4" />
        </Card>
      </Col>
      <Col>
        <Card>
          <Title>Days elapsed vs remaining</Title>
          <Text>stacked per batch</Text>
          <BarChart
            data={daysData}
            index="name"
            categories={['Elapsed', 'Remaining']}
            colors={['blue', 'gray']}
            stack
            className="mt-4 h-72"
          />
        </Card>
      </Col>
      <Col>
        <Card>
          <Title>NTP → Training start lag</Title>
          <Text>15-day rule reference</Text>
          <BarChart data={ntpData} index="name" categories={['NTP lag (days)']} colors={['amber']} className="mt-4 h-72" />
        </Card>
      </Col>
      <Col>
        <Card>
          <Title>Document compliance</Title>
          <Text>critical docs verified · %</Text>
          {docData.length ? (
            <BarList data={docData} valueFormatter={(v: number) => `${v}%`} color="emerald" className="mt-4" />
          ) : (
            <Text className="mt-4">
              {criticalReqs.length === 0
                ? 'No critical document requirements defined.'
                // Untracked is unknown, not zero (ADR-004) — say so rather
                // than leaving a titled card with an empty chart in it.
                : 'No batch tracks a critical document yet, so compliance cannot be scored.'}
            </Text>
          )}
        </Card>
      </Col>
      <Col>
        <Card>
          <Title>Enrolled scholars by batch</Title>
          <Text>avg {avgScholars.toFixed(1)} per batch</Text>
          <BarChart data={scholarData} index="name" categories={['Scholars']} colors={['indigo']} className="mt-4 h-72" />
        </Card>
      </Col>
      <Col>
        <Card>
          <Title>Alerts sent (30 days)</Title>
          <Text>by category</Text>
          <DonutChart
            data={alertsData}
            category="value"
            index="name"
            colors={['rose', 'amber', 'emerald', 'red', 'blue']}
            className="mt-4"
          />
        </Card>
      </Col>
    </Grid>
  );
}
