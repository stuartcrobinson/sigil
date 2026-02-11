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
 * Social Interactions E2E Tests (API Level)
 *
 * Tests the full stack: HTTP → Express → PostgreSQL → Response
 * Covers BDD behaviors: B-INTERACT-001 through B-INTERACT-006
 */

const TEST_PASSWORD = 'TestPass123!';

test.describe('Social Interactions — Likes, High-Fives, Comments', () => {
  test.describe.configure({ mode: 'serial' });

  let userA: AuthTokens;
  let userB: AuthTokens;
  let publicActivityId: number;
  let privateActivityId: number;
  let friendsActivityId: number;

  test.beforeAll(async ({ request }) => {
    // Create two users
    const emailA = generateTestEmail();
    const emailB = generateTestEmail();
    userA = await registerUser(request, emailA, TEST_PASSWORD, 'InteractUserA');
    userB = await registerUser(request, emailB, TEST_PASSWORD, 'InteractUserB');

    // UserA creates activities with different visibility
    publicActivityId = await createActivity(request, userA.token, {
      sport_type: 'running',
      start_time: new Date().toISOString(),
      duration_seconds: 1800,
      distance_meters: 5000,
      visibility: 'public',
    });

    privateActivityId = await createActivity(request, userA.token, {
      sport_type: 'yoga',
      start_time: new Date().toISOString(),
      duration_seconds: 3600,
      visibility: 'private',
    });

    friendsActivityId = await createActivity(request, userA.token, {
      sport_type: 'biking',
      start_time: new Date().toISOString(),
      duration_seconds: 2400,
      distance_meters: 15000,
      visibility: 'friends',
    });
  });

  // --- LIKES ---

  test('B-INTERACT-001: User can like a public activity', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.like_type).toBe('like');
    expect(body.activity_id).toBe(publicActivityId);
    expect(body.user_id).toBe(userB.userId);
  });

  test('B-INTERACT-001: Cannot like the same activity twice', async ({ request }) => {
    // UserB already liked this activity in the previous test
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('already');
  });

  test('B-INTERACT-001: Like count increments correctly', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/likes`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.like_count).toBeGreaterThanOrEqual(1);
    expect(body.likes.length).toBeGreaterThanOrEqual(1);

    // Verify like includes user info
    const like = body.likes.find((l: any) => l.user.id === userB.userId);
    expect(like).toBeDefined();
    expect(like.user.name).toBe('InteractUserB');
  });

  test('B-INTERACT-002: User can unlike an activity', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('removed');

    // Verify like count decremented
    const likesResponse = await request.get(
      `${API_URL}/activities/${publicActivityId}/likes`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );
    const likesBody = await likesResponse.json();
    const userBLike = likesBody.likes.find((l: any) => l.user.id === userB.userId && l.like_type === 'like');
    expect(userBLike).toBeUndefined();
  });

  test('B-INTERACT-002: Can re-like after unliking', async ({ request }) => {
    // Re-like
    const likeResponse = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );
    expect(likeResponse.status()).toBe(201);
  });

  // --- HIGH-FIVES ---

  test('B-INTERACT-003: User can high-five an activity', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'high_five' },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.like_type).toBe('high_five');
  });

  test('B-INTERACT-003: High-five count shown separately from likes', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/likes`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.like_count).toBeGreaterThanOrEqual(1);
    expect(body.high_five_count).toBeGreaterThanOrEqual(1);
    expect(body.total).toBe(body.like_count + body.high_five_count);
  });

  test('B-INTERACT-003: Cannot high-five same activity twice', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'high_five' },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('already');
  });

  test('B-INTERACT-003: High-five and like are independent actions', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/likes`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );

    const body = await response.json();
    const userBInteractions = body.likes.filter((l: any) => l.user.id === userB.userId);
    const likeTypes = userBInteractions.map((l: any) => l.like_type);
    expect(likeTypes).toContain('like');
    expect(likeTypes).toContain('high_five');
  });

  // --- COMMENTS ---

  test('B-INTERACT-004: User can comment on an activity', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'Great run! Keep it up!' },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.text).toBe('Great run! Keep it up!');
    expect(body.user.id).toBe(userB.userId);
    expect(body.user.name).toBe('InteractUserB');
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  test('B-INTERACT-004: Empty comment is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: '' },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('required');
  });

  test('B-INTERACT-004: Whitespace-only comment is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: '   ' },
      }
    );

    expect(response.status()).toBe(400);
  });

  test('B-INTERACT-004: Multiple comments allowed per user', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'Second comment here!' },
      }
    );

    expect(response.status()).toBe(201);
  });

  test('B-INTERACT-004: Comments are in chronological order', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.comments.length).toBeGreaterThanOrEqual(2);
    expect(body.count).toBe(body.comments.length);

    // Verify chronological order
    for (let i = 1; i < body.comments.length; i++) {
      const prev = new Date(body.comments[i - 1].created_at).getTime();
      const curr = new Date(body.comments[i].created_at).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  test('B-INTERACT-005: User can delete own comment', async ({ request }) => {
    // Create a comment to delete
    const createResponse = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'Comment to delete' },
      }
    );
    const comment = await createResponse.json();

    // Delete it
    const deleteResponse = await request.delete(
      `${API_URL}/activities/${publicActivityId}/comments/${comment.id}`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );

    expect(deleteResponse.status()).toBe(200);
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.message).toContain('deleted');
  });

  test('B-INTERACT-005: Cannot delete another user\'s comment', async ({ request }) => {
    // UserB creates a comment
    const createResponse = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'UserB comment' },
      }
    );
    const comment = await createResponse.json();

    // UserA tries to delete it
    const deleteResponse = await request.delete(
      `${API_URL}/activities/${publicActivityId}/comments/${comment.id}`,
      {
        headers: { Authorization: `Bearer ${userA.token}` },
      }
    );

    expect(deleteResponse.status()).toBe(403);
    const body = await deleteResponse.json();
    expect(body.error).toContain('own');
  });

  // --- PRIVACY ENFORCEMENT ---

  test('B-INTERACT-001: Cannot like a private activity you don\'t own', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${privateActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('permission');
  });

  test('B-INTERACT-004: Cannot comment on a private activity you don\'t own', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${privateActivityId}/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'Should not work' },
      }
    );

    expect(response.status()).toBe(403);
  });

  test('B-INTERACT-001: Cannot interact with friends-only activity without following', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${friendsActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(403);
  });

  test('B-INTERACT-001: Can interact with friends-only activity after following', async ({ request }) => {
    // UserB follows UserA
    await followUser(request, userB.token, userA.userId);

    const response = await request.post(
      `${API_URL}/activities/${friendsActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(201);
  });

  test('B-INTERACT-001: Activity owner can like their own activity', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${privateActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userA.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(201);
  });

  // --- INVALID INPUT ---

  test('Invalid like_type is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'love' },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid like_type');
  });

  test('Like on non-existent activity returns 404', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/999999/like`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { like_type: 'like' },
      }
    );

    expect(response.status()).toBe(404);
  });

  test('Comment on non-existent activity returns 404', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/999999/comments`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { text: 'Hello!' },
      }
    );

    expect(response.status()).toBe(404);
  });

  test('Unauthenticated requests are rejected', async ({ request }) => {
    const likeResponse = await request.post(
      `${API_URL}/activities/${publicActivityId}/like`,
      {
        data: { like_type: 'like' },
      }
    );

    expect(likeResponse.status()).toBe(401);

    const commentResponse = await request.post(
      `${API_URL}/activities/${publicActivityId}/comments`,
      {
        data: { text: 'Hello!' },
      }
    );

    expect(commentResponse.status()).toBe(401);
  });
});
