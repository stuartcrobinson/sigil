/**
 * API helpers for E2E tests
 *
 * These helpers make direct HTTP calls to the backend API,
 * enabling full-stack E2E testing of features independent of UI.
 */

import { APIRequestContext } from '@playwright/test';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface AuthTokens {
  token: string;
  userId: number;
}

/**
 * Register a new user and return auth token
 */
export async function registerUser(
  request: APIRequestContext,
  email: string,
  password: string,
  name: string
): Promise<AuthTokens> {
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { email, password, name },
  });

  if (!response.ok()) {
    throw new Error(`Registration failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  return { token: body.token, userId: body.user.id };
}

/**
 * Login and return auth token
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthTokens> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  return { token: body.token, userId: body.user.id };
}

/**
 * Create an activity and return its ID
 */
export async function createActivity(
  request: APIRequestContext,
  token: string,
  data: {
    sport_type: string;
    start_time: string;
    duration_seconds: number;
    distance_meters?: number;
    visibility?: string;
    notes?: string;
    title?: string;
    sport_data?: Record<string, unknown>;
  }
): Promise<number> {
  const response = await request.post(`${API_URL}/activities`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });

  if (!response.ok()) {
    throw new Error(`Create activity failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  return body.id;
}

/**
 * Follow a user
 */
export async function followUser(
  request: APIRequestContext,
  token: string,
  userId: number
): Promise<void> {
  const response = await request.post(`${API_URL}/social/users/${userId}/follow`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Follow failed: ${response.status()} ${await response.text()}`);
  }
}

/**
 * Generate a unique email for testing (no MailSlurp dependency for API tests)
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `e2e_test_${timestamp}_${random}@test.sigil.app`;
}

export { API_URL };
