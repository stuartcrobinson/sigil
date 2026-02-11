import { test, expect } from '@playwright/test';
import {
  registerUser,
  generateTestEmail,
  API_URL,
  AuthTokens,
} from './helpers/api-helpers';

/**
 * GPS Activity E2E Tests (API Level)
 *
 * Tests creating, retrieving, and validating GPS-tracked activities
 * with route_points in sport_data JSONB field.
 *
 * Covers BDD behaviors: B-GPS-002, B-GPS-004, B-GPS-008
 */

const TEST_PASSWORD = 'TestPass123!';

// Simulated GPS route: a small loop (approx 1.5km)
const MOCK_ROUTE_POINTS = [
  { latitude: 40.7829, longitude: -73.9654, timestamp: 1707552000000, speed: 2.8, accuracy: 5 },
  { latitude: 40.7832, longitude: -73.9650, timestamp: 1707552005000, speed: 2.9, accuracy: 4 },
  { latitude: 40.7836, longitude: -73.9645, timestamp: 1707552010000, speed: 3.0, accuracy: 5 },
  { latitude: 40.7840, longitude: -73.9640, timestamp: 1707552015000, speed: 2.7, accuracy: 6 },
  { latitude: 40.7843, longitude: -73.9636, timestamp: 1707552020000, speed: 2.8, accuracy: 4 },
  { latitude: 40.7846, longitude: -73.9632, timestamp: 1707552025000, speed: 3.1, accuracy: 5 },
  { latitude: 40.7849, longitude: -73.9628, timestamp: 1707552030000, speed: 2.9, accuracy: 5 },
  { latitude: 40.7852, longitude: -73.9625, timestamp: 1707552035000, speed: 2.6, accuracy: 7 },
  { latitude: 40.7855, longitude: -73.9622, timestamp: 1707552040000, speed: 2.8, accuracy: 5 },
  { latitude: 40.7858, longitude: -73.9620, timestamp: 1707552045000, speed: 3.0, accuracy: 4 },
];

test.describe('GPS Activity Creation & Retrieval', () => {
  test.describe.configure({ mode: 'serial' });

  let runner: AuthTokens;
  let gpsActivityId: number;

  test.beforeAll(async ({ request }) => {
    const email = generateTestEmail();
    runner = await registerUser(request, email, TEST_PASSWORD, 'GPSRunner');
  });

  test('B-GPS-008: Create running activity with GPS route_points in sport_data', async ({ request }) => {
    const response = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'running',
        title: 'E2E GPS Morning Run',
        start_time: '2024-02-10T07:00:00Z',
        end_time: '2024-02-10T07:30:00Z',
        duration_seconds: 1800,
        distance_meters: 1500,
        visibility: 'public',
        sport_data: {
          route_points: MOCK_ROUTE_POINTS,
          avg_pace: '12:00',
          total_distance_meters: 1500,
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.sport_type).toBe('running');
    expect(body.sport_data).toBeDefined();
    expect(body.sport_data.route_points).toBeDefined();
    expect(body.sport_data.route_points.length).toBe(MOCK_ROUTE_POINTS.length);

    gpsActivityId = body.id;
  });

  test('B-GPS-002: Retrieved activity contains full GPS route data', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities/${gpsActivityId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.sport_data.route_points.length).toBe(10);

    // Verify first point has all required fields (use toBeCloseTo for floats)
    const firstPoint = body.sport_data.route_points[0];
    expect(firstPoint.latitude).toBeCloseTo(40.7829, 4);
    expect(firstPoint.longitude).toBeCloseTo(-73.9654, 4);
    expect(firstPoint.timestamp).toBe(1707552000000);
    expect(firstPoint.speed).toBeCloseTo(2.8, 1);
    expect(firstPoint.accuracy).toBeCloseTo(5, 0);
  });

  test('B-GPS-002: Route data includes avg_pace and total_distance', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities/${gpsActivityId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    const body = await response.json();
    expect(body.sport_data.avg_pace).toBe('12:00');
    expect(body.sport_data.total_distance_meters).toBe(1500);
  });

  test('B-GPS-008: Create walking activity with GPS route data', async ({ request }) => {
    const response = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'walking',
        title: 'E2E GPS Walk',
        start_time: '2024-02-10T12:00:00Z',
        duration_seconds: 2400,
        distance_meters: 2000,
        visibility: 'public',
        sport_data: {
          route_points: MOCK_ROUTE_POINTS.slice(0, 5),
          avg_pace: '20:00',
          total_distance_meters: 2000,
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.sport_type).toBe('walking');
    expect(body.sport_data.route_points.length).toBe(5);
  });

  test('B-GPS-008: Create biking activity with GPS route data', async ({ request }) => {
    const response = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'biking',
        title: 'E2E GPS Ride',
        start_time: '2024-02-10T16:00:00Z',
        duration_seconds: 3600,
        distance_meters: 25000,
        visibility: 'public',
        sport_data: {
          route_points: MOCK_ROUTE_POINTS,
          avg_pace: '2:24',
          total_distance_meters: 25000,
          max_speed: 12.5,
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.sport_type).toBe('biking');
    expect(body.sport_data.route_points.length).toBe(10);
    expect(body.sport_data.max_speed).toBe(12.5);
  });

  test('B-GPS-002: GPS activity appears in activity list with enriched data', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const gpsActivity = body.activities.find((a: { id: number }) => a.id === gpsActivityId);

    expect(gpsActivity).toBeDefined();
    expect(gpsActivity.user_name).toBe('GPSRunner');
    expect(gpsActivity.title).toBe('E2E GPS Morning Run');
    expect(Number(gpsActivity.distance_meters)).toBe(1500);
    expect(gpsActivity.duration_seconds).toBe(1800);
  });

  test('B-GPS-004: GPS route preserved through create→retrieve cycle', async ({ request }) => {
    // Create with specific route
    const createResponse = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'running',
        title: 'Round Trip Test',
        start_time: '2024-02-11T06:00:00Z',
        duration_seconds: 600,
        distance_meters: 1000,
        visibility: 'public',
        sport_data: {
          route_points: MOCK_ROUTE_POINTS,
        },
      },
    });
    const created = await createResponse.json();

    // Retrieve and verify exact match
    const getResponse = await request.get(`${API_URL}/activities/${created.id}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });
    const retrieved = await getResponse.json();

    expect(retrieved.sport_data.route_points).toEqual(MOCK_ROUTE_POINTS);
  });

  test('B-GPS-008: Activity without GPS data still works (no sport_data)', async ({ request }) => {
    const response = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'running',
        title: 'Manual Entry Run',
        start_time: '2024-02-11T08:00:00Z',
        duration_seconds: 900,
        distance_meters: 2000,
        visibility: 'public',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.sport_data).toBeNull();
  });

  test('B-GPS-002: Other users can see GPS activity when public', async ({ request }) => {
    const otherEmail = generateTestEmail();
    const otherUser = await registerUser(request, otherEmail, TEST_PASSWORD, 'GPSViewer');

    const response = await request.get(`${API_URL}/activities/${gpsActivityId}`, {
      headers: { Authorization: `Bearer ${otherUser.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.sport_data.route_points.length).toBe(10);
    expect(body.title).toBe('E2E GPS Morning Run');
  });

  test('B-GPS-008: Private GPS activity not visible to others', async ({ request }) => {
    // Create private GPS activity
    const privateResponse = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'running',
        title: 'Secret Run',
        start_time: '2024-02-11T10:00:00Z',
        duration_seconds: 600,
        distance_meters: 1000,
        visibility: 'private',
        sport_data: { route_points: MOCK_ROUTE_POINTS.slice(0, 3) },
      },
    });
    const privateActivity = await privateResponse.json();

    // Other user cannot see it
    const otherEmail = generateTestEmail();
    const otherUser = await registerUser(request, otherEmail, TEST_PASSWORD, 'GPSSnooper');

    const response = await request.get(`${API_URL}/activities/${privateActivity.id}`, {
      headers: { Authorization: `Bearer ${otherUser.token}` },
    });

    expect(response.status()).toBe(403);
  });
});
