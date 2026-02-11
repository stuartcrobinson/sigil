import request from 'supertest';
import app from '../index';
import { pool } from '../db';
import bcrypt from 'bcrypt';

describe('Activity API', () => {
  let authToken1: string;
  let authToken2: string;
  let userId1: number;
  let userId2: number;
  let activityId1: number;
  let activityId2: number;

  beforeEach(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['activity-user1@test.com', hashedPassword, 'Activity User 1']
    );
    userId1 = user1.rows[0].id;

    const user2 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['activity-user2@test.com', hashedPassword, 'Activity User 2']
    );
    userId2 = user2.rows[0].id;

    // Login to get tokens
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'activity-user1@test.com', password: 'password123' });
    authToken1 = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'activity-user2@test.com', password: 'password123' });
    authToken2 = login2.body.token;
  });

  afterEach(async () => {
    // Clean up in reverse order of dependencies
    await pool.query('DELETE FROM activities WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM follows WHERE follower_id IN ($1, $2) OR following_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId1, userId2]);
  });

  describe('POST /api/activities', () => {
    it('should create a new activity with valid data', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          title: 'Morning Run',
          description: 'Beautiful morning run in the park',
          start_time: '2024-02-10T07:00:00Z',
          end_time: '2024-02-10T08:00:00Z',
          duration_seconds: 3600,
          distance_meters: 5000,
          visibility: 'public',
          sport_data: { avg_pace: '6:00', splits: ['6:05', '5:55', '6:00'] }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.sport_type).toBe('running');
      expect(response.body.title).toBe('Morning Run');
      expect(response.body.user_id).toBe(userId1);
      expect(response.body.visibility).toBe('public');
      expect(response.body.sport_data).toEqual({ avg_pace: '6:00', splits: ['6:05', '5:55', '6:00'] });

      activityId1 = response.body.id;
    });

    it('should create activity with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'yoga',
          start_time: '2024-02-10T09:00:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.sport_type).toBe('yoga');
      expect(response.body.visibility).toBe('public'); // Default visibility
    });

    it('should reject activity without sport_type', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          start_time: '2024-02-10T09:00:00Z'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('sport_type and start_time are required');
    });

    it('should reject activity without start_time', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('sport_type and start_time are required');
    });

    it('should reject activity with invalid sport_type', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'invalid_sport',
          start_time: '2024-02-10T09:00:00Z'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid sport_type');
    });

    it('should reject activity with invalid visibility', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'invalid_visibility'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid visibility');
    });

    it('should reject activity with negative duration', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          start_time: '2024-02-10T09:00:00Z',
          duration_seconds: -100
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('duration_seconds cannot be negative');
    });

    it('should reject activity with negative distance', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          start_time: '2024-02-10T09:00:00Z',
          distance_meters: -1000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('distance_meters cannot be negative');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/activities')
        .send({
          sport_type: 'running',
          start_time: '2024-02-10T09:00:00Z'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/activities/:id', () => {
    beforeEach(async () => {
      // Create a public activity for user1
      const activity1 = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          title: 'Test Run',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'public'
        });
      activityId1 = activity1.body.id;

      // Create a private activity for user2
      const activity2 = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          sport_type: 'yoga',
          title: 'Private Yoga',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'private'
        });
      activityId2 = activity2.body.id;
    });

    it('should get activity by id if user owns it', async () => {
      const response = await request(app)
        .get(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(activityId1);
      expect(response.body.title).toBe('Test Run');
    });

    it('should get public activity by id for any authenticated user', async () => {
      const response = await request(app)
        .get(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(activityId1);
    });

    it('should not allow viewing private activity by non-owner', async () => {
      const response = await request(app)
        .get(`/api/activities/${activityId2}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should allow viewing friends-only activity if user follows owner', async () => {
      // Create friends-only activity for user1
      const activity = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'weightlifting',
          title: 'Friends Workout',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'friends'
        });
      const friendsActivityId = activity.body.id;

      // User2 follows User1
      await request(app)
        .post(`/api/social/users/${userId1}/follow`)
        .set('Authorization', `Bearer ${authToken2}`);

      // User2 should be able to view User1's friends-only activity
      const response = await request(app)
        .get(`/api/activities/${friendsActivityId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(friendsActivityId);
      expect(response.body.visibility).toBe('friends');
    });

    it('should not allow viewing friends-only activity if user does not follow owner', async () => {
      // Create friends-only activity for user1
      const activity = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'weightlifting',
          title: 'Friends Workout',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'friends'
        });
      const friendsActivityId = activity.body.id;

      // User2 does NOT follow User1
      const response = await request(app)
        .get(`/api/activities/${friendsActivityId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should return 404 for non-existent activity', async () => {
      const response = await request(app)
        .get('/api/activities/999999')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Activity not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/activities/${activityId1}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/activities/:id', () => {
    beforeEach(async () => {
      // Create activity for user1
      const activity = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          title: 'Original Title',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'public'
        });
      activityId1 = activity.body.id;
    });

    it('should update activity if user owns it', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          title: 'Updated Title',
          description: 'New description'
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(activityId1);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('New description');
    });

    it('should update visibility', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          visibility: 'private'
        });

      expect(response.status).toBe(200);
      expect(response.body.visibility).toBe('private');
    });

    it('should not allow updating activity by non-owner', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          title: 'Hacked Title'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should return 404 for non-existent activity', async () => {
      const response = await request(app)
        .put('/api/activities/999999')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          title: 'New Title'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Activity not found');
    });

    it('should reject invalid sport_type', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'invalid_sport'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid sport_type');
    });

    it('should reject invalid visibility', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          visibility: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid visibility');
    });

    it('should reject negative duration', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          duration_seconds: -100
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('duration_seconds cannot be negative');
    });

    it('should reject negative distance', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          distance_meters: -500
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('distance_meters cannot be negative');
    });

    it('should return error when no fields provided', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No fields to update');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/activities/${activityId1}`)
        .send({
          title: 'New Title'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/activities/:id', () => {
    beforeEach(async () => {
      // Create activity for user1
      const activity = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          title: 'To Delete',
          start_time: '2024-02-10T09:00:00Z'
        });
      activityId1 = activity.body.id;
    });

    it('should delete activity if user owns it', async () => {
      const response = await request(app)
        .delete(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');

      // Verify activity is deleted
      const getResponse = await request(app)
        .get(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(getResponse.status).toBe(404);
    });

    it('should not allow deleting activity by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/activities/${activityId1}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should return 404 for non-existent activity', async () => {
      const response = await request(app)
        .delete('/api/activities/999999')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Activity not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/activities/${activityId1}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/activities (list with filters)', () => {
    beforeEach(async () => {
      // Create multiple activities for testing filters
      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          title: 'Public Run',
          start_time: '2024-02-10T07:00:00Z',
          visibility: 'public'
        });

      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'yoga',
          title: 'Private Yoga',
          start_time: '2024-02-10T08:00:00Z',
          visibility: 'private'
        });

      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'weightlifting',
          title: 'Friends Lifting',
          start_time: '2024-02-10T09:00:00Z',
          visibility: 'friends'
        });

      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          sport_type: 'running',
          title: 'User2 Public Run',
          start_time: '2024-02-10T10:00:00Z',
          visibility: 'public'
        });
    });

    it('should list all visible activities (public + own + friends)', async () => {
      const response = await request(app)
        .get('/api/activities?limit=100')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeInstanceOf(Array);
      // User1 sees: own 3 (public, private, friends) + user2's public = at least 4
      expect(response.body.activities.length).toBeGreaterThanOrEqual(4);

      // Verify all 4 expected activities are present by title
      const titles = response.body.activities.map((a: { title: string }) => a.title);
      expect(titles).toContain('Public Run');
      expect(titles).toContain('Private Yoga');
      expect(titles).toContain('Friends Lifting');
      expect(titles).toContain('User2 Public Run');
    });

    it('should filter activities by user_id', async () => {
      const response = await request(app)
        .get(`/api/activities?user_id=${userId1}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeInstanceOf(Array);
      // Guard: filter must return results (empty array .every() is vacuously true)
      expect(response.body.activities.length).toBeGreaterThan(0);
      expect(response.body.activities.every((a: { user_id: number }) => a.user_id === userId1)).toBe(true);
    });

    it('should filter activities by sport_type', async () => {
      const response = await request(app)
        .get('/api/activities?sport_type=running')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeInstanceOf(Array);
      // Guard: filter must return results (empty array .every() is vacuously true)
      expect(response.body.activities.length).toBeGreaterThan(0);
      expect(response.body.activities.every((a: { sport_type: string }) => a.sport_type === 'running')).toBe(true);
    });

    it('should filter activities by visibility', async () => {
      const response = await request(app)
        .get('/api/activities?visibility=public')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeInstanceOf(Array);
      // Guard: filter must return results (empty array .every() is vacuously true)
      expect(response.body.activities.length).toBeGreaterThan(0);
      expect(response.body.activities.every((a: { visibility: string }) => a.visibility === 'public')).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      // First get all activities to know the full set
      const allResponse = await request(app)
        .get('/api/activities?limit=100')
        .set('Authorization', `Bearer ${authToken1}`);
      const allActivities = allResponse.body.activities;
      expect(allActivities.length).toBeGreaterThanOrEqual(3);

      // Now test limit=2, offset=1
      const response = await request(app)
        .get('/api/activities?limit=2&offset=1')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeInstanceOf(Array);
      // Verify limit is actually applied to data
      expect(response.body.activities.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(1);

      // Verify offset is applied: first result with offset=1 should match second result from full list
      if (allActivities.length > 1) {
        expect(response.body.activities[0].id).toBe(allActivities[1].id);
      }
    });

    it('should not show private activities from other users', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      const user1PrivateActivity = response.body.activities.find(
        (a: { user_id: number; visibility: string }) => a.user_id === userId1 && a.visibility === 'private'
      );
      expect(user1PrivateActivity).toBeUndefined();
    });

    it('should show friends-only activities from followed users', async () => {
      // User2 follows User1
      await request(app)
        .post(`/api/social/users/${userId1}/follow`)
        .set('Authorization', `Bearer ${authToken2}`);

      const response = await request(app)
        .get('/api/activities?limit=100')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      const user1FriendsActivity = response.body.activities.find(
        (a: { user_id: number; visibility: string; title: string }) =>
          a.user_id === userId1 && a.visibility === 'friends' && a.title === 'Friends Lifting'
      );
      expect(user1FriendsActivity).toBeDefined();
    });

    it('should not show friends-only activities from non-followed users', async () => {
      // User2 does NOT follow User1
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      const user1FriendsActivity = response.body.activities.find(
        (a: { user_id: number; visibility: string }) => a.user_id === userId1 && a.visibility === 'friends'
      );
      expect(user1FriendsActivity).toBeUndefined();
    });

    it('should order activities by start_time DESC (most recent first)', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      const activities = response.body.activities;
      if (activities.length > 1) {
        for (let i = 0; i < activities.length - 1; i++) {
          const current = new Date(activities[i].start_time);
          const next = new Date(activities[i + 1].start_time);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/activities');

      expect(response.status).toBe(401);
    });

    it('should include like_count, comment_count, high_five_count, and photo_count in activity list', async () => {
      // Create an activity
      const createRes = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          sport_type: 'running',
          title: 'Counts Test Run',
          start_time: '2024-02-10T11:00:00Z',
          visibility: 'public'
        });
      const testActivityId = createRes.body.id;

      // Add a like from user2
      await request(app)
        .post(`/api/activities/${testActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      // Add a high-five from user2
      await request(app)
        .post(`/api/activities/${testActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'high_five' });

      // Add a comment from user2
      await request(app)
        .post(`/api/activities/${testActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'Great run!' });

      // Fetch the activity list and verify enriched counts
      const response = await request(app)
        .get(`/api/activities?user_id=${userId1}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      const activity = response.body.activities.find((a: { id: number }) => a.id === testActivityId);
      expect(activity).toBeDefined();
      expect(activity.like_count).toBe(1);
      expect(activity.high_five_count).toBe(1);
      expect(activity.comment_count).toBe(1);
      expect(activity.photo_count).toBe(0);
      expect(activity.user_name).toBe('Activity User 1');
    });
  });
});
