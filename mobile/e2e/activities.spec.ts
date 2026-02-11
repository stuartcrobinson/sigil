import { test, expect } from '@playwright/test';
import { createTestEmail, deleteTestEmail } from './helpers/mailpail';
import { createTestUser, TEST_ACTIVITIES } from './helpers/test-data';

/**
 * Activity Tracking E2E Tests
 *
 * Tests cover:
 * - B-ACTIVITY-001: Log a Workout Activity
 * - B-ACTIVITY-002: View Activity List
 * - B-ACTIVITY-003: Edit Activity
 * - B-ACTIVITY-004: Delete Activity
 */

test.describe('Activity Tracking Flow', () => {
  let testEmail: { id: string; emailAddress: string };
  let testUser: ReturnType<typeof createTestUser>;

  // Helper to register and login before each test
  test.beforeEach(async ({ page }) => {
    testEmail = await createTestEmail();
    testUser = createTestUser(testEmail.emailAddress);

    // Register
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });
    await registerButton.click();

    // Wait for successful login
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });
  });

  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestEmail(testEmail.id);
    }
  });

  test('B-ACTIVITY-001: User can log a workout activity', async ({ page }) => {
    // Navigate to activity logging (might be on home screen or separate tab)
    const logActivityButton = page.getByRole('button', { name: /log.*activity|add.*workout|new.*activity/i });

    // If button is not visible, might need to navigate to Home tab first
    const isVisible = await logActivityButton.isVisible().catch(() => false);
    if (!isVisible) {
      const homeTab = page.getByRole('button', { name: /home/i });
      await homeTab.click();
      await logActivityButton.waitFor({ state: 'visible' });
    }

    await logActivityButton.click();

    // Fill activity form
    const activity = TEST_ACTIVITIES[0]; // Running activity

    // Select sport (could be dropdown or input)
    const sportField = page.locator('input[placeholder*="sport" i], select[name*="sport" i]').first();
    await sportField.fill(activity.sport);

    // Enter duration
    const durationField = page.locator('input[placeholder*="duration" i], input[name*="duration" i]').first();
    await durationField.fill(activity.duration.toString());

    // Enter distance (optional)
    if (activity.distance) {
      const distanceField = page.locator('input[placeholder*="distance" i], input[name*="distance" i]').first();
      await distanceField.fill(activity.distance.toString());
    }

    // Enter notes (optional)
    if (activity.notes) {
      const notesField = page.locator('input[placeholder*="notes" i], textarea[placeholder*="notes" i]').first();
      await notesField.fill(activity.notes);
    }

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit|save|log.*activity/i });
    await submitButton.click();

    // Should show success message OR navigate to activity list (one must succeed)
    const successVisible = await page.getByText(/success|saved|logged|created/i).isVisible().catch(() => false);
    const onActivitiesPage = /\/(home|activities)/i.test(page.url());
    expect(successVisible || onActivitiesPage).toBe(true);

    // Activity should appear in the list
    await expect(page.getByText(activity.sport)).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(new RegExp(`${activity.duration}.*min`, 'i'))
    ).toBeVisible();
  });

  test('B-ACTIVITY-002: User can view activity list', async ({ page }) => {
    // Create a couple of activities first
    for (let i = 0; i < 2; i++) {
      const activity = TEST_ACTIVITIES[i];

      const logActivityButton = page.getByRole('button', { name: /log.*activity|add.*workout|new.*activity/i });
      await logActivityButton.click();

      const sportField = page.locator('input[placeholder*="sport" i], select[name*="sport" i]').first();
      await sportField.fill(activity.sport);

      const durationField = page.locator('input[placeholder*="duration" i]').first();
      await durationField.fill(activity.duration.toString());

      if (activity.distance) {
        const distanceField = page.locator('input[placeholder*="distance" i]').first();
        await distanceField.fill(activity.distance.toString());
      }

      const submitButton = page.getByRole('button', { name: /submit|save|log.*activity/i });
      await submitButton.click();

      // Wait for submission to complete
      await page.waitForTimeout(1000);
    }

    // Navigate to activity list (might already be there)
    const homeTab = page.getByRole('button', { name: /home/i });
    await homeTab.click();

    // Should see both activities
    await expect(page.getByText(TEST_ACTIVITIES[0].sport)).toBeVisible();
    await expect(page.getByText(TEST_ACTIVITIES[1].sport)).toBeVisible();

    // Most recent should be at the top (reverse chronological)
    const activities = await page.locator('[data-testid*="activity"], .activity-item, li').all();
    // Guard: must find at least 2 activities (prevents vacuous pass)
    expect(activities.length).toBeGreaterThanOrEqual(2);
    const firstActivity = activities[0];
    await expect(firstActivity).toContainText(TEST_ACTIVITIES[1].sport);
  });

  test('B-ACTIVITY-003: User can edit an activity', async ({ page }) => {
    // Create an activity first
    const activity = TEST_ACTIVITIES[0];

    const logActivityButton = page.getByRole('button', { name: /log.*activity|add.*workout|new.*activity/i });
    await logActivityButton.click();

    const sportField = page.locator('input[placeholder*="sport" i], select[name*="sport" i]').first();
    await sportField.fill(activity.sport);

    const durationField = page.locator('input[placeholder*="duration" i]').first();
    await durationField.fill(activity.duration.toString());

    const submitButton = page.getByRole('button', { name: /submit|save|log.*activity/i });
    await submitButton.click();

    // Wait for activity to be created
    await expect(page.getByText(activity.sport)).toBeVisible({ timeout: 5000 });

    // Click on the activity to open details
    await page.getByText(activity.sport).click();

    // Look for edit button
    const editButton = page.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Modify the duration
    const newDuration = 45;
    const durationEditField = page.locator('input[placeholder*="duration" i], input[name*="duration" i]').first();
    await durationEditField.clear();
    await durationEditField.fill(newDuration.toString());

    // Save changes
    const saveButton = page.getByRole('button', { name: /save|update/i });
    await saveButton.click();

    // Should show success or navigate back
    await expect(
      page.getByText(new RegExp(`${newDuration}.*min`, 'i'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('B-ACTIVITY-004: User can delete an activity', async ({ page }) => {
    // Create an activity
    const activity = TEST_ACTIVITIES[0];

    const logActivityButton = page.getByRole('button', { name: /log.*activity|add.*workout|new.*activity/i });
    await logActivityButton.click();

    const sportField = page.locator('input[placeholder*="sport" i], select[name*="sport" i]').first();
    await sportField.fill(activity.sport);

    const durationField = page.locator('input[placeholder*="duration" i]').first();
    await durationField.fill(activity.duration.toString());

    const submitButton = page.getByRole('button', { name: /submit|save|log.*activity/i });
    await submitButton.click();

    // Wait for activity to be created
    await expect(page.getByText(activity.sport)).toBeVisible({ timeout: 5000 });

    // Click on the activity
    await page.getByText(activity.sport).click();

    // Look for delete button
    const deleteButton = page.getByRole('button', { name: /delete|remove/i });
    await deleteButton.click();

    // Should show confirmation dialog
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    await confirmButton.click();

    // Activity should be removed from the list
    await expect(page.getByText(activity.sport)).not.toBeVisible({ timeout: 5000 });
  });

  test('B-ACTIVITY-001: Activity creation fails without required fields', async ({ page }) => {
    const logActivityButton = page.getByRole('button', { name: /log.*activity|add.*workout|new.*activity/i });
    await logActivityButton.click();

    // Try to submit without filling any fields
    const submitButton = page.getByRole('button', { name: /submit|save|log.*activity/i });

    // Button must be disabled OR submission must show validation error
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      // Confirm it is truly disabled (not just a coincidence)
      expect(isDisabled).toBe(true);
    } else {
      await submitButton.click();
      // Must show validation errors — this assertion MUST pass, no silent fallthrough
      await expect(
        page.getByText(/required|must.*provide|please.*enter/i)
      ).toBeVisible({ timeout: 5000 });
    }
    // Verify we did NOT navigate away (still on form page)
    await expect(page).not.toHaveURL(/\/(home|activities)$/i);
  });

  test('B-ACTIVITY-001: Activity creation fails with negative duration', async ({ page }) => {
    const logActivityButton = page.getByRole('button', { name: /log.*activity|add.*workout|new.*activity/i });
    await logActivityButton.click();

    const sportField = page.locator('input[placeholder*="sport" i], select[name*="sport" i]').first();
    await sportField.fill('Running');

    const durationField = page.locator('input[placeholder*="duration" i]').first();
    await durationField.fill('-10');

    const submitButton = page.getByRole('button', { name: /submit|save|log.*activity/i });

    // Button must be disabled OR submission must show validation error
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      expect(isDisabled).toBe(true);
    } else {
      await submitButton.click();
      // Must show validation error — no silent fallthrough
      await expect(
        page.getByText(/invalid|positive|greater than|negative/i)
      ).toBeVisible({ timeout: 5000 });
    }
    // Verify we did NOT navigate away (still on form page)
    await expect(page).not.toHaveURL(/\/(home|activities)$/i);
  });
});
