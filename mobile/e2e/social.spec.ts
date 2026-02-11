import { test, expect } from '@playwright/test';
import {
  registerUser,
  generateTestEmail,
  API_URL,
  AuthTokens,
} from './helpers/api-helpers';

/**
 * Social Features E2E Tests (API Level)
 *
 * Tests the full stack: HTTP → Express → PostgreSQL → Response
 * Covers BDD behaviors: B-SOCIAL-001 through B-SOCIAL-005, B-PROFILE-001, B-PROFILE-002
 */

const TEST_PASSWORD = 'TestPass123!';

test.describe('Social Features — Search, Follow, Unfollow', () => {
  test.describe.configure({ mode: 'serial' });

  let userA: AuthTokens;
  let userB: AuthTokens;
  let userC: AuthTokens;

  test.beforeAll(async ({ request }) => {
    userA = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'AliceSocial');
    userB = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'BobSocial');
    userC = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'CharlieSocial');
  });

  // --- SEARCH ---

  test('B-SOCIAL-001: Search returns users by name', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/social/search?q=AliceSocial`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.users.length).toBeGreaterThanOrEqual(1);
    const found = body.users.find((u: any) => u.id === userA.userId);
    expect(found).toBeDefined();
    expect(found.name).toBe('AliceSocial');
  });

  test('B-SOCIAL-001: Search is case-insensitive', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/social/search?q=alicesocial`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const found = body.users.find((u: any) => u.id === userA.userId);
    expect(found).toBeDefined();
  });

  test('B-SOCIAL-001: Search returns empty for no matches', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/social/search?q=zzzznonexistent99999`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.users.length).toBe(0);
  });

  test('B-SOCIAL-001: Search does not expose password hashes', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/social/search?q=AliceSocial`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    const body = await response.json();
    const found = body.users[0];
    expect(found.password_hash).toBeUndefined();
    expect(found.password).toBeUndefined();
  });

  // --- FOLLOW ---

  test('B-SOCIAL-002: User can follow another user', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/social/users/${userA.userId}/follow`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.message).toContain('followed');
  });

  test('B-SOCIAL-002: Cannot follow yourself', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/social/users/${userB.userId}/follow`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('yourself');
  });

  test('B-SOCIAL-002: Cannot follow the same user twice', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/social/users/${userA.userId}/follow`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('already');
  });

  test('B-SOCIAL-002: Follow relationship persists', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/social/users/${userA.userId}/followers`,
      { headers: { Authorization: `Bearer ${userA.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const follower = body.followers.find((f: any) => f.id === userB.userId);
    expect(follower).toBeDefined();
  });

  // --- FOLLOWERS/FOLLOWING LISTS ---

  test('B-SOCIAL-004: View followers list with accurate count', async ({ request }) => {
    // Also have UserC follow UserA
    await request.post(
      `${API_URL}/social/users/${userA.userId}/follow`,
      { headers: { Authorization: `Bearer ${userC.token}` } }
    );

    const response = await request.get(
      `${API_URL}/social/users/${userA.userId}/followers`,
      { headers: { Authorization: `Bearer ${userA.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.followers.length).toBeGreaterThanOrEqual(2);
    expect(body.count).toBe(body.followers.length);

    const follower = body.followers[0];
    expect(follower.name).toBeDefined();
    expect(follower.password_hash).toBeUndefined();
    expect(follower.password).toBeUndefined();
  });

  test('B-SOCIAL-005: View following list', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/social/users/${userB.userId}/following`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.following.length).toBeGreaterThanOrEqual(1);

    const followed = body.following.find((f: any) => f.id === userA.userId);
    expect(followed).toBeDefined();
    expect(followed.name).toBe('AliceSocial');
  });

  test('B-SOCIAL-004: Empty followers list for new user', async ({ request }) => {
    const loner = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'LonerUser');

    const response = await request.get(
      `${API_URL}/social/users/${loner.userId}/followers`,
      { headers: { Authorization: `Bearer ${loner.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.followers.length).toBe(0);
    expect(body.count).toBe(0);
  });

  // --- UNFOLLOW ---

  test('B-SOCIAL-003: User can unfollow another user', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/social/users/${userA.userId}/unfollow`,
      { headers: { Authorization: `Bearer ${userC.token}` } }
    );

    expect(response.status()).toBe(200);

    // Verify UserC is no longer in UserA's followers
    const followersResponse = await request.get(
      `${API_URL}/social/users/${userA.userId}/followers`,
      { headers: { Authorization: `Bearer ${userA.token}` } }
    );
    const followersBody = await followersResponse.json();
    const unfollowed = followersBody.followers.find((f: any) => f.id === userC.userId);
    expect(unfollowed).toBeUndefined();
  });

  test('B-SOCIAL-003: Unfollow non-existing follow returns error', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/social/users/${userA.userId}/unfollow`,
      { headers: { Authorization: `Bearer ${userC.token}` } }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // --- PROFILE ---

  test('B-PROFILE-001: User can view their own profile', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/auth/me`,
      { headers: { Authorization: `Bearer ${userA.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user.name).toBe('AliceSocial');
    expect(body.user.id).toBe(userA.userId);
    expect(body.user.password_hash).toBeUndefined();
    expect(body.user.password).toBeUndefined();
  });

  test('B-PROFILE-002: User can update their profile', async ({ request }) => {
    const response = await request.put(
      `${API_URL}/users/${userA.userId}`,
      {
        headers: { Authorization: `Bearer ${userA.token}` },
        data: { name: 'AliceSocialUpdated', bio: 'Love running and biking!' },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user.name).toBe('AliceSocialUpdated');
    expect(body.user.bio).toBe('Love running and biking!');
  });

  test('B-PROFILE-002: Cannot update another user\'s profile', async ({ request }) => {
    const response = await request.put(
      `${API_URL}/users/${userA.userId}`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
        data: { name: 'Hacked' },
      }
    );

    expect(response.status()).toBe(403);
  });

  test('B-PROFILE-001: Can view another user\'s public profile', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/users/${userA.userId}`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user.name).toBe('AliceSocialUpdated');
    expect(body.user.password_hash).toBeUndefined();
    expect(body.user.password).toBeUndefined();
  });

  // --- AUTH EDGE CASES ---

  test('Unauthenticated follow is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/social/users/${userA.userId}/follow`
    );

    expect(response.status()).toBe(401);
  });

  test('Follow non-existent user returns error', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/social/users/999999/follow`,
      { headers: { Authorization: `Bearer ${userB.token}` } }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
