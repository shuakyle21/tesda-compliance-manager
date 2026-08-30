import { clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

// Obtains a Clerk Testing Token before any spec runs, so every test can call
// setupClerkTestingToken() to bypass Clerk's bot detection.
// Reference: https://clerk.com/docs/guides/development/testing/playwright/overview
setup.describe.configure({ mode: 'serial' });

setup('global setup', async () => {
  await clerkSetup();
});
