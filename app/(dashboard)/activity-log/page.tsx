/**
 * SCREEN 1 — Activity Log (build this first)
 *
 * WHY FIRST:
 * The Activity Log is the simplest screen — it's a flat list of events.
 * No complex layout, no charts, no expandable rows. Building it first
 * lets you validate the full data flow (types → mock data → component)
 * before tackling batch cards or analytics.
 *
 * NEXT.JS CONCEPT: This is a Server Component page. It imports data
 * directly at the top level — no useEffect, no useState, no loading spinner
 * needed on first render. Next.js streams the HTML to the browser.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching
 * LEARN Ch 7 — Fetching Data: https://nextjs.org/learn/dashboard-app/fetching-data
 * LEARN Ch 8 — Static and Dynamic Rendering: https://nextjs.org/learn/dashboard-app/static-and-dynamic-rendering
 */

// TODO S1-1: Import MOCK_ACTIVITY from the data layer.
import { MOCK_ACTIVITY } from '@/lib/data/mock-batches';

// TODO S1-2: Import ActivityEvent type (used for typing the mapped items).
import type { ActivityEvent } from '@/lib/data/types';

export default function ActivityLogPage() {
  // TODO S1-3: Replace this placeholder with real data.
const events = MOCK_ACTIVITY;  // later: await getActivityFromDb()

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="t-page-title">Activity Log</h1>
        {/* TODO S1-4: Add an Export button here (icon: 'download', label: 'Export log').
            For now it can be a disabled stub — functionality comes later.
            Button spec: h-8, border border-[var(--color-border)], radius-lg,
            t-cell text, icon 14px left of label, 4px gap. */}
      </div>

      {/* TODO S1-5: Build the activity event list.
          Map over `events` and render an ActivityRow for each one.

          Each ActivityRow shows:
            - Left: a 3px colored left border (tone: green/blue/amber/red)
              matching --color-{tone} CSS variable
            - Who + text: t-cell for who (semibold), t-body for text
            - When: t-mono, right-aligned, muted

          Layout pattern (a single row):
            <div className="flex items-start gap-3 py-3 border-b border-[var(--color-border-faint)]">
              <div className="w-0.5 self-stretch rounded" style={{ background: 'var(--color-{tone})' }} />
              <div className="flex-1">
                <span className="t-cell font-medium">{event.who}</span>
                <span className="t-body ml-1">{event.text}</span>
              </div>
              <span className="t-mono shrink-0">{event.when}</span>
            </div>

          TIP: Extract this into a separate ActivityRow component in
          components/ui/ActivityRow.tsx once the structure is right. */}

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
        {/* TODO S1-5: map events here */}
        <p className="t-body p-4">Activity log placeholder — complete TODO S1-3 and S1-5.</p>
      </div>
    </div>
  );
}
