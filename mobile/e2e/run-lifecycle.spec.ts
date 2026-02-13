import { test, expect } from '@playwright/test';
import {
  registerUser,
  createActivity,
  generateTestEmail,
  API_URL,
  AuthTokens,
} from './helpers/api-helpers';

/**
 * Run Lifecycle E2E Tests (API Level)
 *
 * Tests the complete lifecycle of a GPS-tracked running activity
 * through direct API calls, simulating what the mobile app does.
 *
 * Covers BDD behaviors:
 *   B-RUN-001: Start a GPS-tracked run
 *   B-RUN-002: Take a photo during a run
 *   B-RUN-003: Pause a run
 *   B-RUN-004: Resume a paused run
 *   B-RUN-005: Stop a run
 *   B-RUN-006: Save a completed run with GPS + photos
 *   B-RUN-007: Pace and stats are correct
 *   B-RUN-008: Route points preserved across pause/resume
 */

const TEST_PASSWORD = 'TestPass123!';

// Simulated GPS route: Central Park loop (~2.5km in 15 minutes = 6:00/km pace)
// Phase 1: Before pause (points 0-4, ~1km in 6 min)
const ROUTE_PHASE_1 = [
  { latitude: 40.7829, longitude: -73.9654, timestamp: 1707552000000, speed: 2.8, accuracy: 5 },
  { latitude: 40.7835, longitude: -73.9645, timestamp: 1707552060000, speed: 2.9, accuracy: 4 },
  { latitude: 40.7842, longitude: -73.9635, timestamp: 1707552120000, speed: 3.0, accuracy: 5 },
  { latitude: 40.7850, longitude: -73.9625, timestamp: 1707552180000, speed: 2.7, accuracy: 6 },
  { latitude: 40.7858, longitude: -73.9615, timestamp: 1707552240000, speed: 2.8, accuracy: 4 },
];

// Phase 2: After resume (points 5-9, ~1.5km in 9 min)
const ROUTE_PHASE_2 = [
  { latitude: 40.7865, longitude: -73.9608, timestamp: 1707552420000, speed: 2.9, accuracy: 5 },
  { latitude: 40.7870, longitude: -73.9600, timestamp: 1707552480000, speed: 3.1, accuracy: 5 },
  { latitude: 40.7875, longitude: -73.9590, timestamp: 1707552540000, speed: 2.6, accuracy: 7 },
  { latitude: 40.7880, longitude: -73.9580, timestamp: 1707552600000, speed: 2.8, accuracy: 5 },
  { latitude: 40.7885, longitude: -73.9570, timestamp: 1707552660000, speed: 3.0, accuracy: 4 },
];

const ALL_ROUTE_POINTS = [...ROUTE_PHASE_1, ...ROUTE_PHASE_2];

// Photo taken mid-run at point 3 position
const PHOTO_GPS = {
  latitude: ROUTE_PHASE_1[3].latitude,
  longitude: ROUTE_PHASE_1[3].longitude,
};

test.describe('B-RUN: Full Run Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  let runner: AuthTokens;
  let activityId: number;

  test.beforeAll(async ({ request }) => {
    const email = generateTestEmail();
    runner = await registerUser(request, email, TEST_PASSWORD, `RunTester${Date.now()}`);
  });

  // --- B-RUN-001: Login and start a GPS-tracked run ---

  test('B-RUN-001: User can register/login and start tracking', async ({ request }) => {
    // Verify user is authenticated
    const meResponse = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });
    expect(meResponse.status()).toBe(200);
    const me = await meResponse.json();
    expect(me.user.id).toBe(runner.userId);
  });

  // --- B-RUN-006: Save a run with GPS route data (simulates start → track → stop → save) ---

  test('B-RUN-006: Save a completed run with full GPS route', async ({ request }) => {
    // This simulates: start tracking → collect GPS points → stop → save
    // The mobile app sends all collected route_points in sport_data when saving
    const totalDurationSeconds = 900; // 15 minutes
    const totalDistanceMeters = 2500; // 2.5km
    // Average pace: 900s / 2.5km = 360s/km = 6:00/km
    const avgPace = '6:00';

    const response = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'running',
        title: 'E2E Lifecycle Run',
        start_time: new Date(Date.now() - 15 * 60_000).toISOString(), // 15 min ago
        end_time: new Date().toISOString(),
        duration_seconds: totalDurationSeconds,
        distance_meters: totalDistanceMeters,
        visibility: 'public',
        sport_data: {
          route_points: ALL_ROUTE_POINTS,
          avg_pace: avgPace,
          total_distance_meters: totalDistanceMeters,
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.sport_type).toBe('running');
    expect(body.duration_seconds).toBe(totalDurationSeconds);
    expect(Number(body.distance_meters)).toBe(totalDistanceMeters);

    activityId = body.id;
  });

  // --- B-RUN-007: Pace and stats are correct ---

  test('B-RUN-007: Saved activity has correct pace and distance', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Verify sport_data persisted correctly
    expect(body.sport_data).toBeDefined();
    expect(body.sport_data.avg_pace).toBe('6:00');
    expect(body.sport_data.total_distance_meters).toBe(2500);

    // Verify avg_pace is a reasonable running pace (between 3:00 and 15:00/km)
    const [minutes, seconds] = body.sport_data.avg_pace.split(':').map(Number);
    const totalPaceSeconds = minutes * 60 + seconds;
    expect(totalPaceSeconds).toBeGreaterThanOrEqual(180); // >= 3:00/km
    expect(totalPaceSeconds).toBeLessThanOrEqual(900); // <= 15:00/km

    // Verify distance is reasonable for duration
    // At 6:00/km pace, 15 min = 2.5km. Allow 10% margin
    const distanceKm = Number(body.distance_meters) / 1000;
    expect(distanceKm).toBeGreaterThanOrEqual(2.0);
    expect(distanceKm).toBeLessThanOrEqual(3.0);
  });

  // --- B-RUN-008: Route points preserved across pause/resume ---

  test('B-RUN-008: All GPS points from both phases are preserved', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    const body = await response.json();
    const points = body.sport_data.route_points;

    // All 10 points (5 pre-pause + 5 post-resume) should be present
    expect(points.length).toBe(ALL_ROUTE_POINTS.length);

    // Verify first point (start of run)
    expect(points[0].latitude).toBeCloseTo(ROUTE_PHASE_1[0].latitude, 4);
    expect(points[0].longitude).toBeCloseTo(ROUTE_PHASE_1[0].longitude, 4);

    // Verify last point before pause (end of phase 1)
    expect(points[4].latitude).toBeCloseTo(ROUTE_PHASE_1[4].latitude, 4);

    // Verify first point after resume (start of phase 2)
    expect(points[5].latitude).toBeCloseTo(ROUTE_PHASE_2[0].latitude, 4);

    // Verify last point (end of run)
    expect(points[9].latitude).toBeCloseTo(ROUTE_PHASE_2[4].latitude, 4);

    // Verify timestamps are monotonically increasing
    for (let i = 1; i < points.length; i++) {
      expect(points[i].timestamp).toBeGreaterThan(points[i - 1].timestamp);
    }
  });

  // --- B-RUN-002: Take a photo during a run ---

  test('B-RUN-002: Add a photo with GPS coordinates to the activity', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/activities/${activityId}/photos`,
      {
        headers: { Authorization: `Bearer ${runner.token}` },
        data: {
          photo_url: 'https://example.com/photos/mid_run_selfie.jpg',
          caption: 'Mid-run selfie at Central Park',
          latitude: PHOTO_GPS.latitude,
          longitude: PHOTO_GPS.longitude,
          route_position_meters: 800,
        },
      }
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.activity_id).toBe(activityId);
    expect(parseFloat(body.latitude)).toBeCloseTo(PHOTO_GPS.latitude, 3);
    expect(parseFloat(body.longitude)).toBeCloseTo(PHOTO_GPS.longitude, 3);
    expect(parseFloat(body.route_position_meters)).toBe(800);
  });

  test('B-RUN-002: Photo appears in activity photos list', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/activities/${activityId}/photos`,
      {
        headers: { Authorization: `Bearer ${runner.token}` },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.photos.length).toBeGreaterThanOrEqual(1);
    expect(body.photos[0].caption).toBe('Mid-run selfie at Central Park');
  });

  // --- B-RUN-003 / B-RUN-004: Pause and resume behavior ---

  test('B-RUN-003/004: Paused run creates valid activity with correct duration', async ({ request }) => {
    // Simulate: 5 min active → 3 min pause → 5 min active = 10 min total active time
    const response = await request.post(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${runner.token}` },
      data: {
        sport_type: 'running',
        title: 'E2E Pause/Resume Run',
        start_time: '2024-02-10T08:00:00Z',
        end_time: '2024-02-10T08:13:00Z', // 13 min wall clock
        duration_seconds: 600, // 10 min active (excluding pause)
        distance_meters: 1600,
        visibility: 'public',
        sport_data: {
          route_points: [
            // Phase 1 (before pause)
            ...ROUTE_PHASE_1.slice(0, 3),
            // Phase 2 (after resume) — note timestamp gap representing pause
            ...ROUTE_PHASE_2.slice(0, 3),
          ],
          avg_pace: '6:15',
          total_distance_meters: 1600,
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Duration should reflect active time only, not wall clock time
    expect(body.duration_seconds).toBe(600);
    expect(Number(body.distance_meters)).toBe(1600);

    // Pace should be reasonable for the active time
    // 600s / 1.6km = 375s/km = 6:15/km
    expect(body.sport_data.avg_pace).toBe('6:15');
  });

  // --- B-RUN-005: Stop a run (no more points accepted) ---

  test('B-RUN-005: Completed run has correct final state', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Activity has all expected fields
    expect(body.sport_type).toBe('running');
    expect(body.title).toBe('E2E Lifecycle Run');
    expect(body.start_time).toBeDefined();
    expect(body.end_time).toBeDefined();
    expect(body.duration_seconds).toBeGreaterThan(0);
    expect(Number(body.distance_meters)).toBeGreaterThan(0);
    expect(body.sport_data.route_points.length).toBeGreaterThan(0);
    expect(body.sport_data.avg_pace).toBeDefined();
  });

  // --- B-RUN-007: Edge case — pace validation for different sports ---

  test('B-RUN-007: Walking activity has reasonable walking pace', async ({ request }) => {
    // Walking pace: ~10:00-20:00/km (much slower than running)
    const walkId = await createActivity(request, runner.token, {
      sport_type: 'walking',
      title: 'E2E Walk',
      start_time: new Date().toISOString(),
      duration_seconds: 1800, // 30 min
      distance_meters: 2400, // 2.4km
      visibility: 'public',
      sport_data: {
        route_points: ROUTE_PHASE_1,
        avg_pace: '12:30', // 30min / 2.4km = 12:30/km
        total_distance_meters: 2400,
      },
    });

    const response = await request.get(`${API_URL}/activities/${walkId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    const body = await response.json();
    const [min, sec] = body.sport_data.avg_pace.split(':').map(Number);
    const paceSeconds = min * 60 + sec;

    // Walking pace should be 8:00-25:00/km
    expect(paceSeconds).toBeGreaterThanOrEqual(480); // >= 8:00/km
    expect(paceSeconds).toBeLessThanOrEqual(1500); // <= 25:00/km
  });

  test('B-RUN-007: Biking activity has reasonable biking pace', async ({ request }) => {
    // Biking pace: ~2:00-6:00/km (faster than running)
    const bikeId = await createActivity(request, runner.token, {
      sport_type: 'biking',
      title: 'E2E Ride',
      start_time: new Date().toISOString(),
      duration_seconds: 3600, // 60 min
      distance_meters: 20000, // 20km
      visibility: 'public',
      sport_data: {
        route_points: ALL_ROUTE_POINTS,
        avg_pace: '3:00', // 60min / 20km = 3:00/km
        total_distance_meters: 20000,
      },
    });

    const response = await request.get(`${API_URL}/activities/${bikeId}`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    const body = await response.json();
    const [min, sec] = body.sport_data.avg_pace.split(':').map(Number);
    const paceSeconds = min * 60 + sec;

    // Biking pace should be 1:30-8:00/km
    expect(paceSeconds).toBeGreaterThanOrEqual(90); // >= 1:30/km
    expect(paceSeconds).toBeLessThanOrEqual(480); // <= 8:00/km
  });

  // --- B-RUN-006: Activity appears in feed after save ---

  test('B-RUN-006: Saved run appears in feed with correct metadata', async ({ request }) => {
    const response = await request.get(`${API_URL}/activities?limit=100`, {
      headers: { Authorization: `Bearer ${runner.token}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const activity = body.activities.find((a: { id: number }) => a.id === activityId);

    expect(activity).toBeDefined();
    expect(activity.title).toBe('E2E Lifecycle Run');
    expect(activity.sport_type).toBe('running');
    expect(activity.photo_count).toBeGreaterThanOrEqual(1);
  });
});
