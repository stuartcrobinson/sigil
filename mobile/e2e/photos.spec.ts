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
 * Photo Management E2E Tests (API Level)
 *
 * Tests the full stack: HTTP → Express → PostgreSQL → Response
 * Covers BDD behaviors: B-PHOTO-001 through B-PHOTO-003
 */

const TEST_PASSWORD = 'TestPass123!';

test.describe('Photo Management — Add, View, Delete with GPS', () => {
  test.describe.configure({ mode: 'serial' });

  let owner: AuthTokens;
  let viewer: AuthTokens;
  let stranger: AuthTokens;
  let publicActivityId: number;
  let privateActivityId: number;
  let friendsActivityId: number;

  test.beforeAll(async ({ request }) => {
    // Create users
    owner = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'PhotoOwner');
    viewer = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'PhotoViewer');
    stranger = await registerUser(request, generateTestEmail(), TEST_PASSWORD, 'PhotoStranger');

    // Viewer follows Owner (for friends-only visibility)
    await followUser(request, viewer.token, owner.userId);

    // Create activities with different visibility
    publicActivityId = await createActivity(request, owner.token, {
      sport_type: 'running',
      start_time: new Date().toISOString(),
      duration_seconds: 1800,
      distance_meters: 5000,
      visibility: 'public',
    });

    privateActivityId = await createActivity(request, owner.token, {
      sport_type: 'biking',
      start_time: new Date().toISOString(),
      duration_seconds: 3600,
      visibility: 'private',
    });

    friendsActivityId = await createActivity(request, owner.token, {
      sport_type: 'walking',
      start_time: new Date().toISOString(),
      duration_seconds: 2700,
      distance_meters: 3000,
      visibility: 'friends',
    });
  });

  // --- ADD PHOTOS ---

  test('B-PHOTO-001: Owner can add photo with GPS coordinates', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/run_sunset.jpg',
          caption: 'Beautiful sunset during my run',
          latitude: 40.7829,
          longitude: -73.9654,
          route_position_meters: 1500,
        },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.photo_url).toBe('https://example.com/photos/run_sunset.jpg');
    expect(body.caption).toBe('Beautiful sunset during my run');
    expect(parseFloat(body.latitude)).toBeCloseTo(40.7829, 3);
    expect(parseFloat(body.longitude)).toBeCloseTo(-73.9654, 3);
    expect(parseFloat(body.route_position_meters)).toBe(1500);
    expect(body.activity_id).toBe(publicActivityId);
    expect(body.user_id).toBe(owner.userId);
  });

  test('B-PHOTO-001: Owner can add photo without GPS (e.g., gym photo)', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/post_run.jpg',
        },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.latitude).toBeNull();
    expect(body.longitude).toBeNull();
    expect(body.route_position_meters).toBeNull();
  });

  test('B-PHOTO-001: Owner can add photo with caption only', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/finish.jpg',
          caption: 'Finished!',
          latitude: 40.7835,
          longitude: -73.9660,
          route_position_meters: 5000,
        },
      }
    );

    expect(response.status()).toBe(201);
  });

  test('B-PHOTO-001: Photo requires photo_url', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          caption: 'No URL provided',
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('photo_url');
  });

  test('B-PHOTO-001: Cannot add photo to someone else\'s activity', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${viewer.token}` },
        data: {
          photo_url: 'https://example.com/photos/hacker.jpg',
        },
      }
    );

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('own');
  });

  // --- GPS VALIDATION ---

  test('B-PHOTO-001: Invalid latitude is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/bad.jpg',
          latitude: 91.0,
          longitude: -73.9654,
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Latitude');
  });

  test('B-PHOTO-001: Invalid longitude is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/bad.jpg',
          latitude: 40.7829,
          longitude: -181.0,
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Longitude');
  });

  test('B-PHOTO-001: Negative route_position_meters is rejected', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/bad.jpg',
          route_position_meters: -100,
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('route_position_meters');
  });

  // --- VIEW PHOTOS ---

  test('B-PHOTO-002: Anyone can view photos on a public activity', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${stranger.token}` },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.photos.length).toBeGreaterThanOrEqual(3);
    expect(body.count).toBe(body.photos.length);
  });

  test('B-PHOTO-002: Photos are ordered by route position', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
      }
    );

    const body = await response.json();
    const photosWithPosition = body.photos.filter(
      (p: any) => p.route_position_meters !== null
    );

    // Guard: must have multiple photos to verify ordering (prevents vacuous pass)
    expect(photosWithPosition.length).toBeGreaterThan(1);

    // Verify ascending order by route_position_meters
    for (let i = 1; i < photosWithPosition.length; i++) {
      expect(parseFloat(photosWithPosition[i].route_position_meters))
        .toBeGreaterThanOrEqual(parseFloat(photosWithPosition[i - 1].route_position_meters));
    }
  });

  test('B-PHOTO-002: Photos include GPS coordinates', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
      }
    );

    const body = await response.json();
    const gpsPhoto = body.photos.find((p: any) => p.latitude !== null);
    expect(gpsPhoto).toBeDefined();
    expect(parseFloat(gpsPhoto.latitude)).toBeCloseTo(40.7829, 3);
    expect(parseFloat(gpsPhoto.longitude)).toBeCloseTo(-73.9654, 3);
  });

  // --- PRIVACY ---

  test('B-PHOTO-002: Cannot view photos on a private activity you don\'t own', async ({ request }) => {
    // First add a photo to private activity
    await request.post(
      `${API_URL}/activities/${privateActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/private.jpg',
        },
      }
    );

    // Stranger tries to view
    const response = await request.get(
      `${API_URL}/activities/${privateActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${stranger.token}` },
      }
    );

    expect(response.status()).toBe(403);
  });

  test('B-PHOTO-002: Follower can view photos on friends-only activity', async ({ request }) => {
    // Add photo to friends activity
    await request.post(
      `${API_URL}/activities/${friendsActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/friends.jpg',
        },
      }
    );

    // Viewer (who follows owner) can see
    const response = await request.get(
      `${API_URL}/activities/${friendsActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${viewer.token}` },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.photos.length).toBeGreaterThanOrEqual(1);
  });

  test('B-PHOTO-002: Stranger cannot view photos on friends-only activity', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${friendsActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${stranger.token}` },
      }
    );

    expect(response.status()).toBe(403);
  });

  // --- DELETE PHOTOS ---

  test('B-PHOTO-003: Owner can delete their own photo', async ({ request }) => {
    // Add a photo to delete
    const addResponse = await request.post(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/to_delete.jpg',
          caption: 'Will be deleted',
        },
      }
    );
    const photo = await addResponse.json();

    // Delete it
    const deleteResponse = await request.delete(
      `${API_URL}/activities/${publicActivityId}/photos/${photo.id}`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
      }
    );

    expect(deleteResponse.status()).toBe(200);
    const body = await deleteResponse.json();
    expect(body.message).toContain('deleted');

    // Verify it's gone
    const listResponse = await request.get(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
      }
    );
    const listBody = await listResponse.json();
    const deletedPhoto = listBody.photos.find((p: any) => p.id === photo.id);
    expect(deletedPhoto).toBeUndefined();
  });

  test('B-PHOTO-003: Cannot delete another user\'s photo', async ({ request }) => {
    // Get a photo owned by owner
    const listResponse = await request.get(
      `${API_URL}/activities/${publicActivityId}/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
      }
    );
    const listBody = await listResponse.json();
    const photoId = listBody.photos[0].id;

    // Viewer tries to delete it
    const deleteResponse = await request.delete(
      `${API_URL}/activities/${publicActivityId}/photos/${photoId}`,
      {
        headers: { Authorization: `Bearer ${viewer.token}` },
      }
    );

    expect(deleteResponse.status()).toBe(403);
    const body = await deleteResponse.json();
    expect(body.error).toContain('own');
  });

  test('B-PHOTO-003: Delete non-existent photo returns 404', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/activities/${publicActivityId}/photos/999999`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
      }
    );

    expect(response.status()).toBe(404);
  });

  // --- EDGE CASES ---

  test('Add photo to non-existent activity returns 404', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/999999/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/ghost.jpg',
        },
      }
    );

    expect(response.status()).toBe(404);
  });

  test('Unauthenticated photo request is rejected', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${publicActivityId}/photos`
    );

    expect(response.status()).toBe(401);
  });

  test('Invalid activity ID returns 400', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/not-a-number/photos`,
      {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: {
          photo_url: 'https://example.com/photos/test.jpg',
        },
      }
    );

    expect(response.status()).toBe(400);
  });
});
