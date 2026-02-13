import { defineConfig, devices } from '@playwright/test';

// Read from environment or use defaults
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:19006';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Playwright configuration for Sigil e2e tests
 *
 * Usage:
 * - Local web: npx playwright test
 * - Production: E2E_BASE_URL=https://sigil.pages.dev EXPO_PUBLIC_API_URL=https://sigil-backend.onrender.com/api npx playwright test
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Configure projects
  projects: [
    // API-only tests (social, photos, interactions, feed, GPS, smoke) — single project
    {
      name: 'api',
      testMatch: /\/(interactions|photos|social|feed-enrichment|gps-activity|smoke|run-lifecycle)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    // UI tests (auth, activities) — multiple browsers
    {
      name: 'chromium',
      testIgnore: /\/(interactions|photos|social|feed-enrichment|gps-activity|smoke|run-lifecycle)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      testIgnore: /\/(interactions|photos|social|feed-enrichment|gps-activity|smoke|run-lifecycle)\.spec\.ts$/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testIgnore: /\/(interactions|photos|social|feed-enrichment|gps-activity|smoke|run-lifecycle)\.spec\.ts$/,
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests (optional)
  // webServer: {
  //   command: 'npm start',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  // },
});
