import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Use process.env.PORT by default and fallback to Next.js's default port.
const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

// Reference: https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  outputDir: 'test-results/',
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },

  use: {
    baseURL,
    trace: 'retry-with-trace',
  },
  projects: [
    {
      name: 'global setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'Main tests',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['global setup'],
    },
  ],
});
