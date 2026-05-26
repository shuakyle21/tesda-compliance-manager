/**
 * SCREEN 5 — Analytics (build last)
 *
 * WHY LAST:
 * Analytics requires chart components (Recharts) and aggregated data
 * computed across all batches. Building it last means the data layer and
 * component patterns are already solid.
 *
 * NEXT.JS CONCEPT: Charts use browser APIs (canvas/SVG animation) so the
 * chart components must be 'use client'. But the data fetching and
 * aggregation still happens server-side in this page — you pass the computed
 * data DOWN to the client chart components as props.
 *
 * This pattern (Server Component page → Client Component chart) is the
 * correct way to use Recharts (or any charting lib) in Next.js App Router.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#using-third-party-packages-and-providers
 * LEARN Ch 9 — Streaming (Server → Client pattern): https://nextjs.org/learn/dashboard-app/streaming
 * LEARN Ch 7 — Fetching Data (server-side aggregation): https://nextjs.org/learn/dashboard-app/fetching-data
 *
 * SPEC RULES:
 *   - Use Recharts (referenced in ui_kits/admin/Charts.jsx)
 *   - Chart colors use semantic tokens — never arbitrary colors
 *   - Charts animate on mount (400ms, ease-spring), once only
 *   - No colored shadows on chart elements
 *   - Chart labels use t-mono or t-label classes
 *
 * REQUIRED CHARTS (from the spec):
 *   1. Progress comparison bar chart (one bar per batch)
 *   2. Timeline / Gantt-style training period chart
 *   3. Billing deadline countdown (days remaining per batch)
 */

// TODO S5-1: Import MOCK_BATCHES.
// import { MOCK_BATCHES } from '@/lib/data/mock-batches';

// TODO S5-2: Import chart components (these will be 'use client').
// import { ProgressChart } from '@/components/ui/charts/ProgressChart';
// import { TimelineChart } from '@/components/ui/charts/TimelineChart';
// import { BillingCountdownChart } from '@/components/ui/charts/BillingCountdownChart';

export default function AnalyticsPage() {
  // TODO S5-3: Compute chart data from MOCK_BATCHES server-side.
  // Example for progress chart:
  //   const progressData = MOCK_BATCHES.map(b => ({
  //     label: b.id,
  //     value: b.progressPct,
  //     color: `var(--color-${b.urgency === 'critical' ? 'red' : b.urgency === 'warning' ? 'amber' : 'green'})`,
  //   }));
  //
  // WHY compute here: If you compute in the Client Component, it runs
  // on the browser on every render. Here, it runs once on the server.

  return (
    <div>
      <div className="mb-6">
        <h1 className="t-page-title">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TODO S5-4: Replace each placeholder with a real chart component.
            Pass computed data as props.

            Chart card wrapper pattern:
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)]
                 border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
                <h2 className="t-section mb-4">Training Progress</h2>
                <ProgressChart data={progressData} />
              </div> */}

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
          <h2 className="t-section mb-2">Training Progress</h2>
          <p className="t-body">Chart placeholder — complete TODO S5-3 and S5-4.</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
          <h2 className="t-section mb-2">Billing Deadlines</h2>
          <p className="t-body">Chart placeholder — complete TODO S5-3 and S5-4.</p>
        </div>
      </div>
    </div>
  );
}
