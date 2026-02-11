import { test, expect } from '@playwright/test';
import {
  registerUser,
  createActivity,
  followUser,
  generateTestEmail,
  API_URL,
  AuthTokens,
} from './helpers/api-helpers';

/**
 * Activity Feed Enrichment E2E Tests (API Level)
 *
 * Tests that GET /api/activities returns enriched data:
 * - user_name, user_photo_url
 * - like_count, high_five_count, comment_count, photo_count
 *
 * Covers BDD behaviors: B-FEED-001, B-FEED-004, B-INTERACT-006
 */

const TEST_PASSWORD = 'TestPass123!';

test.describe('Activity Feed Enrichment — Social Counts & User Info', () => {
  test.describe.configure({ mode: 'serial' });

  let userA: AuthTokens;
  let userB: AuthTokens;
  let activityId: number;

  test.beforeAll(async ({ request }) => {
    const emailA = generateTestEmail();
    const emailB = generateTestEmail();
    userA = await registerUser(request, emailA, TEST_PASSWORD, 'FeedUserAlice');
    userB = await registerUser(request, emailB, TEST_PASSWORD, 'FeedUserBob');

    // UserA creates a public activity
    activityId = await createActivity(request, userA.token, {
      sport_type: 'running',
      title: 'E2E Enrichment Run',
      start_time: new Date().toISOString(),
      duration_seconds: 1800,
      distance_meters: 5000,
      visibility: 'public',
    });
  });

  test('B-FEED-004: Activity list returns user_name', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity).toBeDefined();
    expect(activity.user_name).toBe('FeedUserAlice');
  });

  test('B-FEED-004: Activity list returns social counts (all zero initially)', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity).toBeDefined();
    expect(activity.like_count).toBe(0);
    expect(activity.high_five_count).toBe(0);
    expect(activity.comment_count).toBe(0);
    expect(activity.photo_count).toBe(0);
  });

  test('B-INTERACT-006: Like count increments in feed after like', async ({ request }) => {
    // UserB likes the activity
    const likeResponse = await request.post(
      `${API_URL}/activities/${activityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );
    expect(likeResponse.status()).toBe(201);

    // Check feed shows updated count
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity.like_count).toBe(1);
  });

  test('B-INTERACT-006: High-five count increments in feed after high-five', async ({ request }) => {
    // UserB high-fives the activity
    const hfResponse = await request.post(
      `${API_URL}/activities/${activityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'high_five' },
      }
    );
    expect(hfResponse.status()).toBe(201);

    // Check feed shows updated count
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity.high_five_count).toBe(1);
    expect(activity.like_count).toBe(1); // Like from previous test still there
  });

  test('B-INTERACT-006: Comment count increments in feed after comment', async ({ request }) => {
    // UserB adds a comment
    const commentResponse = await request.post(
      `${API_URL}/activities/${activityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'Great run!' },
      }
    );
    expect(commentResponse.status()).toBe(201);

    // Check feed shows updated count
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity.comment_count).toBe(1);
  });

  test('B-INTERACT-006: Photo count increments in feed after photo added', async ({ request }) => {
    // UserA adds a photo to their own activity
    const photoResponse = await request.post(
      `${API_URL}/activities/${activityId}/photos`,
      {
        headers: { Authorization: `Bearer ${userA.token}` },
        data: {
          photo_url: 'https://example.com/e2e-test-photo.jpg',
          caption: 'E2E test photo',
          latitude: 40.7829,
          longitude: -73.9654,
        },
      }
    );
    expect(photoResponse.status()).toBe(201);

    // Check feed shows updated count
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity.photo_count).toBe(1);
  });

  test('B-FEED-004: All counts present and correct after multiple interactions', async ({ request }) => {
    // Add a second comment
    await request.post(
      `${API_URL}/activities/${activityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userA.token}` },
        data: { text: 'Thanks!' },
      }
    );

    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);

    expect(activity.like_count).toBe(1);
    expect(activity.high_five_count).toBe(1);
    expect(activity.comment_count).toBe(2);
    expect(activity.photo_count).toBe(1);
    expect(activity.user_name).toBe('FeedUserAlice');
  });

  test('B-FEED-004: Other user sees same counts in their feed', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);

    expect(activity).toBeDefined();
    expect(activity.like_count).toBe(1);
    expect(activity.high_five_count).toBe(1);
    expect(activity.comment_count).toBe(2);
    expect(activity.photo_count).toBe(1);
  });

  test('B-FEED-004: Unlike decrements like count in feed', async ({ request }) => {
    // UserB unlikes
    const unlikeResponse = await request.delete(
      `${API_URL}/activities/${activityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );
    expect(unlikeResponse.status()).toBe(200);

    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);
    expect(activity.like_count).toBe(0);
    expect(activity.high_five_count).toBe(1); // High-five still there
  });

  test('B-FEED-001: Feed returns pagination metadata', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities?limit=5&offset=0`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await response.json();

    expect(body.pagination).toBeDefined();
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.offset).toBe(0);
    expect(typeof body.pagination.total).toBe('number');
  });

  test('B-FEED-004: Friends-only activity shows enriched data to followers', async ({ request }) => {
    // UserA creates friends-only activity
    const friendsActivityId = await createActivity(request, userA.token, {
      sport_type: 'biking',
      title: 'E2E Friends Ride',
      start_time: new Date().toISOString(),
      duration_seconds: 3600,
      distance_meters: 20000,
      visibility: 'friends',
    });

    // UserB follows UserA
    await followUser(request, userB.token, userA.userId);

    // UserB should see friends-only activity with user_name
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === friendsActivityId);

    expect(activity).toBeDefined();
    expect(activity.user_name).toBe('FeedUserAlice');
    expect(activity.like_count).toBe(0);
    expect(activity.comment_count).toBe(0);
  });
});
