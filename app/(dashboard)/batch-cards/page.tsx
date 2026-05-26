/**
 * SCREEN 4 — Batch Cards (the primary dashboard view)
 *
 * WHY FOURTH:
 * Batch Cards is the most complex screen — each card has an urgency border,
 * a lifecycle pipeline, a progress bar, trainer avatar, BSRS indicator, and
 * a remark. Build it after you have the simpler screens working so the
 * component patterns are already established.
 *
 * NEXT.JS CONCEPT: Server Component + Suspense boundaries.
 * The card list is server-rendered. If you later add real-time updates
 * (e.g. polling for new BSRS approvals), wrap the card list in <Suspense>
 * with a loading.tsx skeleton.
 *
 * DOCS on Suspense: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 * LEARN Ch 9 — Streaming with Suspense: https://nextjs.org/learn/dashboard-app/streaming
 * LEARN Ch 7 — Fetching Data: https://nextjs.org/learn/dashboard-app/fetching-data
 *
 * SPEC RULES:
 *   - Cards sorted by daysToBilling ascending (most urgent first)
 *   - Card has 3px urgency left border: red / amber / green / neutral
 *   - Card padding: 16px
 *   - Gap between cards: 24px
 *   - Progress bar height: 6px (--bar-thick), animated from 0% on mount
 *   - LifecyclePipeline shows all 6 stages with active step pulsing (2s)
 *   - BSRS badge: shield-check (approved) or shield-off (not approved)
 *   - Remark: t-remark class (italic, muted)
 */

// TODO S4-1: Import MOCK_BATCHES.
// import { MOCK_BATCHES } from '@/lib/data/mock-batches';

// TODO S4-2: Import BatchCard component once built.
// import { BatchCard } from '@/components/ui/BatchCard';

export default function BatchCardsPage() {
  // TODO S4-3: const batches = MOCK_BATCHES; (already sorted by urgency)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="t-page-title">Batch Cards</h1>
        {/* TODO S4-4: Add filter/sort controls (stub). */}
      </div>

      {/* Card grid — single column on mobile, stays single column on desktop
          per spec (cards are full-width, not a grid of cards) */}
      <div className="flex flex-col gap-6">
        {/* TODO S4-5: Map over batches and render <BatchCard batch={batch} />
            Reference: ui_kits/admin/BatchCard.jsx
            Port to:   components/ui/BatchCard.tsx

            Inside BatchCard, you'll also need:
              - LifecyclePipeline  (ui_kits/admin/LifecyclePipeline.jsx)
              - ProgressBar        (ui_kits/admin/ProgressBar.jsx)
              - StatusBadge        (ui_kits/admin/StatusBadge.jsx)
              - TrainerAvatar      (ui_kits/admin/TrainerAvatar.jsx)
              - UrgencyIndicator   (ui_kits/admin/UrgencyIndicator.jsx)

            Port each to components/ui/ as you need them.
            Do NOT rewrite — port the logic, convert to TypeScript. */}
        <p className="t-body">
          Batch Cards placeholder — complete TODO S4-3 and S4-5.
        </p>
      </div>
    </div>
  );
}
