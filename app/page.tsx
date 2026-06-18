/**
 * STEP 5 — Root Page: Redirect to Dashboard
 *
 * WHY THIS FILE EXISTS:
 * The root URL `/` has no content of its own — the dashboard lives at
 * `/batch-cards` (or wherever you land by default). This page just redirects.
 *
 * NEXT.JS CONCEPT: `redirect()` from 'next/navigation' is a Server Component
 * utility that sends a 307 Temporary Redirect before the page ever renders.
 * It never sends HTML to the browser for this route — zero flash.
 *
 * DOCS: https://nextjs.org/docs/app/api-reference/functions/redirect
 *
 * ALTERNATIVE PATTERN: You could also put a `redirect()` call in
 * app/(dashboard)/page.tsx instead, if you want `/` to render the shell
 * but redirect the content area to the first tab.
 */

import { redirect } from 'next/navigation';

// TODO 5: Decide your default tab and update the redirect path.
// LEARN Ch 4 — Creating Layouts and Pages: https://nextjs.org/learn/dashboard-app/creating-layouts-and-pages
// LEARN Ch 5 — Navigating Between Pages: https://nextjs.org/learn/dashboard-app/navigating-between-pages
//
// Route mapping now defines `/dashboard` as the landing route for the Figma
// "Frame 1 - Dashboard" screen. Individual screen implementation can still
// follow the TODO build order.
//
// The path matches the folder: app/(dashboard)/dashboard/page.tsx
// The `(dashboard)` part is a Route Group — it does NOT appear in the URL.
// DOCS on Route Groups: https://nextjs.org/docs/app/building-your-application/routing/route-groups
export default function RootPage() {
  redirect('/dashboard');
}
