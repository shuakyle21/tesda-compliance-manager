/**
 * STEP 6 — Dashboard Shell Layout
 *
 * WHY THIS FILE EXISTS:
 * Every dashboard screen (Batch Cards, Table View, Activity Log, etc.) shares
 * the same shell: Topbar at the top, MetricsRow below it, Tab bar for
 * navigation, and a content area. Putting that structure here means you write
 * it once — all child pages automatically inherit it.
 *
 * NEXT.JS CONCEPT: Route Groups — the `(dashboard)` folder name is wrapped
 * in parentheses. Next.js ignores it for URL routing, but it lets you apply
 * this layout only to routes inside this folder. The URL stays clean:
 *   /batch-cards (NOT /dashboard/batch-cards)
 *
 * DOCS on nested layouts: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates#nesting-layouts
 * DOCS on route groups:   https://nextjs.org/docs/app/building-your-application/routing/route-groups
 *
 * SERVER vs CLIENT:
 * This layout is a Server Component (no 'use client'). It can read data,
 * pass it to child components, and lets Next.js stream the shell immediately
 * while the content area loads. Only components that need browser APIs or
 * event handlers should be marked 'use client'.
 */

// LEARN Ch 4 — Creating Layouts and Pages: https://nextjs.org/learn/dashboard-app/creating-layouts-and-pages
// TODO 6a: Import your three shell components once they exist:
// import { Topbar } from '@/components/shell/Topbar';
// import { MetricsRow } from '@/components/shell/MetricsRow';
// import { DashboardTabs } from '@/components/shell/DashboardTabs';
// import { getMockMetrics } from '@/lib/data/mock-batches';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO 6b: Fetch metrics for the MetricsRow.
  // LEARN Ch 7 — Fetching Data: https://nextjs.org/learn/dashboard-app/fetching-data
  //
  // Because this is a Server Component, you can call async functions directly:
  //   const metrics = await getMockMetrics();
  //
  // When Supabase is connected, this becomes:
  //   const metrics = await getMetricsFromDb(tenantId);
  //
  // The MetricsRow receives `metrics` as a prop — it never fetches data itself.
  // This pattern is called "lifting data fetching to the layout" and avoids
  // waterfall requests inside child components.

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* TODO 6c: Replace this placeholder with <Topbar /> once built.
          Topbar is sticky, full-width, shows the TCS logo + last-synced badge.
          It does NOT receive props — it is display-only. */}
      <header className="h-12 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
        {/* Topbar placeholder — see components/shell/Topbar.tsx */}
      </header>

      {/* TODO 6d: Replace with <MetricsRow metrics={metrics} /> once built.
          MetricsRow renders 5 equal-width metric cards.
          It is a Server Component — it just renders data, no interactivity. */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* MetricsRow placeholder — see components/shell/MetricsRow.tsx */}
      </section>

      {/* TODO 6e: Replace with <DashboardTabs /> once built.
          DashboardTabs must be 'use client' because it reads the current
          pathname to highlight the active tab.
          DOCS: https://nextjs.org/docs/app/api-reference/functions/use-pathname */}
      <nav className="h-9 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        {/* DashboardTabs placeholder — see components/shell/DashboardTabs.tsx */}
      </nav>

      {/* Content area — each screen's page.tsx renders here */}
      <main className="flex-1 mx-auto w-full max-w-[1080px] px-6 py-6">
        {children}
      </main>
    </div>
  );
}
