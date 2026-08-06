/**
 * Root page — redirects `/` to the dashboard landing route.
 *
 * `redirect()` issues the redirect before render, so this route never sends HTML
 * and there is no flash of intermediate content.
 */

import { redirect } from 'next/navigation';

// Target is app/(dashboard)/dashboard/page.tsx. `(dashboard)` is a Route Group,
// so it does not appear in the URL — the path is /dashboard, not /(dashboard)/dashboard.
export default function RootPage() {
  redirect('/dashboard');
}
