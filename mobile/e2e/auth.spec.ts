import { test, expect, Page } from '@playwright/test';
import { createTestEmail, deleteTestEmail } from './helpers/mailpail';
import { createTestUser, TEST_PASSWORD } from './helpers/test-data';

/**
 * Authentication E2E Tests
 *
 * Tests cover:
 * - B-AUTH-001: User Registration
 * - B-AUTH-002: User Login
 * - B-AUTH-003: User Logout
 * - B-AUTH-004: Session Persistence
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

/** Navigate to Profile tab and log out (accepts the confirm dialog). */
async function logoutViaUI(page: Page) {
  await page.getByText('Profile').click();
  await expect(page.getByTestId('logout-button')).toBeVisible({ timeout: 5000 });

  page.once('dialog', (d) => d.accept());
  await page.getByTestId('logout-button').click();

  await expect(page.getByTestId('login-button')).toBeVisible({ timeout: 5000 });
}

test.describe('Authentication Flow', () => {
  test.skip(!MAILPAIL_CONFIGURED, 'Skipped: MAILPAIL_DOMAIN/MAILPAIL_S3_BUCKET not set');

  let testEmail: { id: string; emailAddress: string };
  let testUser: ReturnType<typeof createTestUser>;

  test.beforeEach(async () => {
    testEmail = await createTestEmail();
    testUser = createTestUser(testEmail.emailAddress);
  });

  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestEmail(testEmail.id);
    }
  });

  test('B-AUTH-001: User can register with valid credentials', async ({ page }) => {
    await page.goto('/');

    // Should show login screen initially
    await expect(page.getByTestId('login-button')).toBeVisible();

    // Navigate to registration
    await page.getByTestId('register-link').click();
    await expect(page.getByText('Create Account')).toBeVisible({ timeout: 5000 });

    // Fill registration form
    await page.getByTestId('register-name-input').fill(testUser.displayName);
    await page.getByTestId('register-email-input').fill(testUser.email);
    await page.getByTestId('register-password-input').fill(testUser.password);
    await page.getByTestId('register-confirm-password-input').fill(testUser.password);

    // Submit registration
    await page.getByTestId('register-button').click();

    // Should navigate to home screen after successful registration
    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 10000 });
  });

  test('B-AUTH-002: User can login with correct credentials', async ({ page }) => {
    // First, register the user
    await registerViaUI(page, testUser);

    // Logout
    await logoutViaUI(page);

    // Now login
    await page.getByTestId('email-input').fill(testUser.email);
    await page.getByTestId('password-input').fill(testUser.password);
    await page.getByTestId('login-button').click();

    // Should navigate to home screen
    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 10000 });
  });

  test('B-AUTH-002: Login fails with wrong password', async ({ page }) => {
    // Register the user first
    await registerViaUI(page, testUser);

    // Logout
    await logoutViaUI(page);

    // Try to login with wrong password
    await page.getByTestId('email-input').fill(testUser.email);
    await page.getByTestId('password-input').fill('WrongPassword123!');

    // Listen for the alert dialog
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByTestId('login-button').click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/failed|invalid|incorrect|wrong|error/i);
    await dialog.dismiss();

    // Should still be on login screen
    await expect(page.getByTestId('login-button')).toBeVisible();
  });

  test('B-AUTH-003: User can logout', async ({ page }) => {
    // Register and login
    await registerViaUI(page, testUser);

    // Navigate to profile
    await page.getByText('Profile').click();
    await expect(page.getByTestId('logout-button')).toBeVisible({ timeout: 5000 });

    // Logout (accept confirmation dialog)
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('logout-button').click();

    // Should be redirected to login screen
    await expect(page.getByTestId('login-button')).toBeVisible({ timeout: 5000 });
  });

  test('B-AUTH-004: Session persists across page reloads', async ({ page }) => {
    // Register
    await registerViaUI(page, testUser);

    // Reload the page
    await page.reload();

    // Should still be on home screen (session persisted)
    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 10000 });
  });

  test('B-AUTH-001: Registration fails with invalid email', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('register-link').click();
    await expect(page.getByText('Create Account')).toBeVisible({ timeout: 5000 });

    // Fill form with invalid email
    await page.getByTestId('register-name-input').fill(testUser.displayName);
    await page.getByTestId('register-email-input').fill('not-an-email');
    await page.getByTestId('register-password-input').fill(testUser.password);
    await page.getByTestId('register-confirm-password-input').fill(testUser.password);

    // Submit — backend should reject the invalid email
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByTestId('register-button').click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/invalid|email|failed|error/i);
    await dialog.dismiss();

    // Should still be on registration screen (not home)
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('B-AUTH-001: Registration fails with weak password', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('register-link').click();
    await expect(page.getByText('Create Account')).toBeVisible({ timeout: 5000 });

    // Fill form with weak password (< 8 chars)
    await page.getByTestId('register-name-input').fill(testUser.displayName);
    await page.getByTestId('register-email-input').fill(testUser.email);
    await page.getByTestId('register-password-input').fill('weak');
    await page.getByTestId('register-confirm-password-input').fill('weak');

    // Submit — frontend catches password length < 8 synchronously,
    // so the dialog fires during the click action. Use page.once to handle it.
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await page.getByTestId('register-button').click();

    // Give dialog handler a moment to fire
    await page.waitForTimeout(500);
    expect(dialogMessage).toMatch(/password|8 characters|requirement/i);

    // Should still be on registration screen
    await expect(page.getByText('Create Account')).toBeVisible();
  });
});
