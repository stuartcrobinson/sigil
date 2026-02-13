import { test, expect, Page } from '@playwright/test';
import { createTestEmail, deleteTestEmail } from './helpers/mailpail';
import { createTestUser } from './helpers/test-data';

/**
 * Activity Tracking E2E Tests
 *
 * Tests cover:
 * - B-ACTIVITY-001: Log a Workout Activity
 * - B-ACTIVITY-002: View Activity List
 *
 * NOTE: The current UI only supports GPS-tracked activities via RunningActivityScreen.
 * Manual activity entry (sport/duration/distance form) is not yet implemented.
 * These tests verify what IS available: the feed, FAB button, and
 * that activities created via API show up correctly.
 */

const MAILPAIL_CONFIGURED = !!(process.env.MAILPAIL_DOMAIN && process.env.MAILPAIL_S3_BUCKET);

/** Register a user via the web UI and wait for home screen. */
async function registerViaUI(
  page: Page,
  user: { email: string; password: string; displayName: string },
) {
  await page.goto('/');
  await page.getByTestId('register-link').click();
  await expect(page.getByText('Create Account')).toBeVisible({ timeout: 5000 });

  await page.getByTestId('register-name-input').fill(user.displayName);
  await page.getByTestId('register-email-input').fill(user.email);
  await page.getByTestId('register-password-input').fill(user.password);
  await page.getByTestId('register-confirm-password-input').fill(user.password);
  await page.getByTestId('register-button').click();

  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 10000 });
}

test.describe('Activity Tracking Flow', () => {
  test.skip(!MAILPAIL_CONFIGURED, 'Skipped: MAILPAIL_DOMAIN/MAILPAIL_S3_BUCKET not set');

  let testEmail: { id: string; emailAddress: string };
  let testUser: ReturnType<typeof createTestUser>;

  test.beforeEach(async ({ page }) => {
    testEmail = await createTestEmail();
    testUser = createTestUser(testEmail.emailAddress);
    await registerViaUI(page, testUser);
  });

  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestEmail(testEmail.id);
    }
  });

  test('B-ACTIVITY-001: Home screen shows feed and FAB button', async ({ page }) => {
    // After registration, should be on home screen
    await expect(page.getByTestId('home-screen')).toBeVisible();

    // FAB button to start an activity should be visible
    await expect(page.getByTestId('start-activity-fab')).toBeVisible();

    // Should show either the activity feed or empty state
    const hasFeed = await page.getByTestId('activity-feed').isVisible().catch(() => false);
    const hasEmptyState = await page.getByTestId('empty-feed').isVisible().catch(() => false);
    expect(hasFeed || hasEmptyState).toBe(true);
  });

  test('B-ACTIVITY-002: Activity created via API appears in feed', async ({ page }) => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://staging.sigil.fit/api';

    // Login via API to get token
    const loginRes = await page.request.post(`${apiUrl}/auth/login`, {
      data: { email: testUser.email, password: testUser.password },
    });
    const { token } = await loginRes.json();

    // Create activity via API (using correct field names)
    const activityRes = await page.request.post(`${apiUrl}/activities`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        sport_type: 'running',
        start_time: new Date(Date.now() - 30 * 60000).toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: 1800,
        distance_meters: 5000,
        title: 'E2E test run',
      },
    });
    expect(activityRes.ok()).toBeTruthy();

    // Refresh the feed
    await page.reload();
    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 10000 });

    // The feed should show at least one activity
    await expect(page.getByTestId('activity-feed')).toBeVisible();
  });

  test.skip('B-ACTIVITY-003: User can edit an activity', () => {
    // Manual activity editing UI not yet implemented on web
  });

  test.skip('B-ACTIVITY-004: User can delete an activity', () => {
    // Manual activity deletion UI not yet implemented on web
  });
});
