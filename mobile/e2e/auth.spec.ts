import { test, expect } from '@playwright/test';
import { createTestEmail, waitForVerificationEmail, deleteTestEmail } from './helpers/mailslurp';
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

test.describe('Authentication Flow', () => {
  let testEmail: { id: string; emailAddress: string };
  let testUser: ReturnType<typeof createTestUser>;

  test.beforeEach(async () => {
    // Create a disposable email for each test
    testEmail = await createTestEmail();
    testUser = createTestUser(testEmail.emailAddress);
  });

  test.afterEach(async () => {
    // Clean up the test email inbox
    if (testEmail) {
      await deleteTestEmail(testEmail.id);
    }
  });

  test('B-AUTH-001: User can register with valid credentials', async ({ page }) => {
    await page.goto('/');

    // Should show login screen initially
    await expect(page.getByText(/login|sign in/i)).toBeVisible();

    // Navigate to registration
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    // Fill registration form
    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    // Submit registration
    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });
    await registerButton.click();

    // Should navigate to home screen after successful registration
    // (or show success message)
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });

    // Verify we can see authenticated content
    await expect(
      page.getByText(new RegExp(testUser.displayName, 'i'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('B-AUTH-002: User can login with correct credentials', async ({ page }) => {
    // First, register the user
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });
    await registerButton.click();

    // Wait for registration to complete
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });

    // Now logout
    await page.goto('/');
    const profileTab = page.getByRole('button', { name: /profile/i });
    await profileTab.click();

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();

    // Should be back at login screen
    await expect(page.getByText(/login|sign in/i)).toBeVisible();

    // Now try to login
    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);

    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    await loginButton.click();

    // Should navigate to home screen
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });
    await expect(
      page.getByText(new RegExp(testUser.displayName, 'i'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('B-AUTH-002: Login fails with wrong password', async ({ page }) => {
    // First, register the user
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });
    await registerButton.click();
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });

    // Logout
    const profileTab = page.getByRole('button', { name: /profile/i });
    await profileTab.click();
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();

    // Try to login with wrong password
    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', 'WrongPassword123!');

    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    await loginButton.click();

    // Should show error message
    await expect(
      page.getByText(/invalid|incorrect|wrong|failed/i)
    ).toBeVisible({ timeout: 5000 });

    // Should still be on login screen
    await expect(page.getByText(/login|sign in/i)).toBeVisible();
  });

  test('B-AUTH-003: User can logout', async ({ page }) => {
    // Register and login
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });
    await registerButton.click();
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });

    // Navigate to profile
    const profileTab = page.getByRole('button', { name: /profile/i });
    await profileTab.click();

    // Logout
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();

    // Should be redirected to login screen
    await expect(page.getByText(/login|sign in/i)).toBeVisible({ timeout: 5000 });

    // Trying to access profile should redirect to login
    await page.goto('/profile');
    await expect(page.getByText(/login|sign in/i)).toBeVisible({ timeout: 5000 });
  });

  test('B-AUTH-004: Session persists across page reloads', async ({ page }) => {
    // Register
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });
    await registerButton.click();
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 10000 });

    // Reload the page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/\/(home|activities)/i, { timeout: 5000 });
    await expect(
      page.getByText(new RegExp(testUser.displayName, 'i'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('B-AUTH-001: Registration fails with invalid email', async ({ page }) => {
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    // Try with invalid email
    await page.fill('input[placeholder*="email" i]', 'not-an-email');
    await page.fill('input[placeholder*="password" i]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });

    // Button should be disabled or show validation error
    const isDisabled = await registerButton.isDisabled();
    if (!isDisabled) {
      await registerButton.click();
      // Should show error message
      await expect(
        page.getByText(/invalid.*email|email.*invalid/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('B-AUTH-001: Registration fails with weak password', async ({ page }) => {
    await page.goto('/');
    const signUpButton = page.getByRole('button', { name: /sign up|register/i });
    await signUpButton.click();

    // Try with weak password
    await page.fill('input[placeholder*="email" i]', testUser.email);
    await page.fill('input[placeholder*="password" i]', 'weak');
    await page.fill('input[placeholder*="name" i]', testUser.displayName);

    const registerButton = page.getByRole('button', { name: /register|sign up|create account/i });

    // Button should be disabled or show validation error
    const isDisabled = await registerButton.isDisabled();
    if (!isDisabled) {
      await registerButton.click();
      // Should show error about password requirements
      await expect(
        page.getByText(/password.*requirement|weak.*password|password.*strong/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
