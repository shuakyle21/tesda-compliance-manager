/**
 * STEP 7a — Shell Component: Topbar
 *
 * WHY THIS COMPONENT EXISTS:
 * The Topbar is the application header — sticky, full-width, always visible.
 * It shows the TCS logo/wordmark and a "last synced" badge.
 *
 * SERVER vs CLIENT: This component is a Server Component (no 'use client').
 * It has no interactivity — it renders static markup. Keep it server-side
 * so it can render during SSR without any client JS.
 *
 * SPEC RULES TO FOLLOW:
 *   - Height: full-width sticky, z-index above content
 *   - Logo: use assets/logo.svg (the TCS wordmark)
 *   - Last synced badge: IBM Plex Mono, t-mono class, muted color
 *   - No navigation links here — navigation is the DashboardTabs
 *   - No user avatar here yet (Clerk comes later)
 *
 * DOCS on next/image (for the logo SVG):
 * https://nextjs.org/docs/app/api-reference/components/image
 */

// TODO 7a-1: Uncomment and use next/image for the logo.
// LEARN Ch 3 — Optimizing Fonts and Images: https://nextjs.org/learn/dashboard-app/optimizing-fonts-images
// import Image from 'next/image';

export function Topbar() {
  return (
    <div className="h-12 flex items-center justify-between px-6">
      {/* TODO 7a-2: Replace this text with <Image> pointing to /assets/logo.svg.
          Width and height should match the actual SVG dimensions.
          Use priority={true} since it's above the fold (avoids LCP penalty). */}
      <span className="t-card-title text-[var(--color-text-primary)]">
        Training Compliance System
      </span>

      {/* TODO 7a-3: Add the last-synced badge.
          Format: "Synced Apr 21 · 14:02" in t-mono class.
          For now, hardcode a static string. Later, this becomes a prop
          passed from the layout that fetches the last sync timestamp. */}
      <span className="t-mono">
        {/* last-synced placeholder */}
      </span>
    </div>
  );
}
