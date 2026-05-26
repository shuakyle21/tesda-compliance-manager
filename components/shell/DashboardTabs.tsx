/**
 * STEP 7c — Shell Component: DashboardTabs
 *
 * WHY THIS FILE IS 'use client':
 * This component reads `usePathname()` to highlight the active tab.
 * `usePathname` is a React hook that reads the browser URL — it only works
 * in Client Components. The `'use client'` directive tells Next.js to
 * include this component in the browser JS bundle.
 *
 * IMPORTANT: Only this component (and its children) gets sent to the browser.
 * The DashboardLayout that renders this is still a Server Component. Next.js
 * automatically splits the bundle at the 'use client' boundary.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/rendering/client-components
 * DOCS: https://nextjs.org/docs/app/api-reference/functions/use-pathname
 * LEARN Ch 5 — Navigating Between Pages: https://nextjs.org/learn/dashboard-app/navigating-between-pages
 *
 * SPEC RULES:
 *   - Tab bar height: 36px (--h-tab)
 *   - Style: underline (NOT pill/button). Active tab has a 2px bottom border
 *     in --color-blue. Inactive tabs have no underline.
 *   - Tab items: icon + label, icon 16px, gap 4px
 *   - Never use `<a href>` — use Next.js `<Link>` for client-side navigation
 *     without full page reloads.
 *
 * DOCS on Link: https://nextjs.org/docs/app/api-reference/components/link
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// TODO 7c-1: Define the tab configuration array.
// LEARN Ch 5 — Active Links with usePathname(): https://nextjs.org/learn/dashboard-app/navigating-between-pages
//
// Each tab needs: { href: string; label: string; icon: string }
// Icon names come from the spec's semantic icon assignments in README.md:
//   Batch Cards   → 'folders'
//   Table View    → (pick the closest Tabler icon)
//   Documents     → 'file-text'
//   Analytics     → 'chart-bar'
//   Activity Log  → 'timeline'
//
// TIP: Derive the active state by comparing `pathname` to `tab.href`.
// Use `pathname === tab.href` (exact match) — not startsWith, since all
// routes are siblings, not nested.
const TABS = [
  // TODO 7c-1: fill in the 5 tab objects
  { href: '/batch-cards',  label: 'Batch Cards',   icon: 'folders'   },
  { href: '/table-view',   label: 'Table View',    icon: 'list'      },
  { href: '/documents',    label: 'Documents',     icon: 'file-text' },
  { href: '/analytics',    label: 'Analytics',     icon: 'chart-bar' },
  { href: '/activity-log', label: 'Activity Log',  icon: 'timeline'  },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-end h-9 px-6 gap-1">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        // TODO 7c-2: Build the tab item.
        //
        // Structure: <Link href={tab.href}> [icon] [label] </Link>
        //
        // Active styles (isActive === true):
        //   - border-b-2 border-[var(--color-blue)]
        //   - text-[var(--color-blue)] font-medium
        //
        // Inactive styles:
        //   - text-[var(--color-text-secondary)]
        //   - hover: text-[var(--color-text-primary)], bg-[var(--color-surface-alt)]
        //
        // ACCESSIBILITY: Add aria-current="page" when isActive is true.
        // This tells screen readers which tab is the current page.
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex items-center gap-1 px-3 h-full text-xs font-medium transition-colors',
              isActive
                ? 'border-b-2 border-[var(--color-blue)] text-[var(--color-blue)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {/* TODO 7c-3: Replace text icon with actual Tabler SVG icon.
                See ui_kits/admin/Icon.jsx for the existing icon component.
                Port it to components/ui/Icon.tsx. */}
            <span className="text-[13px]">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
