import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test } from '@playwright/test';

// Dashboard routes are guarded server-side by requireAuthenticatedUser()
// (modules/auth/data/auth.ts), called from app/(dashboard)/layout.tsx — not
// by proxy.ts, which only forwards the pathname header. This test exercises
// that redirect, the actual security-relevant behavior.
test.describe('unauthenticated access', () => {
  test('visiting a dashboard route redirects to sign-in', async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto('/dashboard');

    await page.waitForURL(/\/sign-in/);
  });
});
