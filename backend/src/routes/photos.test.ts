import request from 'supertest';
import app from '../index';
import { pool } from '../db';
import bcrypt from 'bcrypt';

describe('Photos API', () => {
  let authToken1: string;
  let authToken2: string;
  let authToken3: string;
  let userId1: number;
  let userId2: number;
  let userId3: number;
  let publicActivityId: number;
  let friendsActivityId: number;
  let privateActivityId: number;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['photo-user1@test.com', hashedPassword, 'Photo User 1']
    );
    userId1 = user1.rows[0].id;

    const user2 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['photo-user2@test.com', hashedPassword, 'Photo User 2']
    );
    userId2 = user2.rows[0].id;

    const user3 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['photo-user3@test.com', hashedPassword, 'Photo User 3']
    );
    userId3 = user3.rows[0].id;

    // User2 follows User1
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [userId2, userId1]);

    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'photo-user1@test.com', password: 'password123' });
    authToken1 = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'photo-user2@test.com', password: 'password123' });
    authToken2 = login2.body.token;

    const login3 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'photo-user3@test.com', password: 'password123' });
    authToken3 = login3.body.token;

    // Create test activities
    const pub = await pool.query(
      `INSERT INTO activities (user_id, sport_type, start_time, visibility, title)
       VALUES ($1, 'running', NOW(), 'public', 'Photo Run') RETURNING id`,
      [userId1]
    );
    publicActivityId = pub.rows[0].id;

    const friends = await pool.query(
      `INSERT INTO activities (user_id, sport_type, start_time, visibility, title)
       VALUES ($1, 'running', NOW(), 'friends', 'Friends Photo Run') RETURNING id`,
      [userId1]
    );
    friendsActivityId = friends.rows[0].id;

    const priv = await pool.query(
      `INSERT INTO activities (user_id, sport_type, start_time, visibility, title)
       VALUES ($1, 'running', NOW(), 'private', 'Private Photo Run') RETURNING id`,
      [userId1]
    );
    privateActivityId = priv.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM activity_photos WHERE user_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM activities WHERE user_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM follows WHERE follower_id IN ($1, $2, $3) OR following_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [userId1, userId2, userId3]);
  });

  describe('POST /api/activities/:id/photos', () => {
    it('should add a photo with GPS coordinates to own activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          photo_url: 'https://example.com/photos/run1.jpg',
          caption: 'Beautiful view at mile 2',
          latitude: 40.7829,
          longitude: -73.9654,
          route_position_meters: 3218.69,
          taken_at: '2024-02-10T07:30:00Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.photo_url).toBe('https://example.com/photos/run1.jpg');
      expect(res.body.caption).toBe('Beautiful view at mile 2');
      expect(parseFloat(res.body.latitude)).toBeCloseTo(40.7829, 4);
      expect(parseFloat(res.body.longitude)).toBeCloseTo(-73.9654, 4);
      expect(parseFloat(res.body.route_position_meters)).toBeCloseTo(3218.69, 1);
    });

    it('should add a photo without GPS coordinates', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          photo_url: 'https://example.com/photos/run2.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeNull();
      expect(res.body.longitude).toBeNull();
    });

    it('should reject photo without photo_url', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ caption: 'No url' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('photo_url');
    });

    it('should reject adding photo to another user\'s activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('own activities');
    });

    it('should reject photo on non-existent activity', async () => {
      const res = await request(app)
        .post('/api/activities/99999/photos')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      expect(res.status).toBe(404);
    });

    it('should reject invalid latitude', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg', latitude: 91, longitude: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Latitude');
    });

    it('should reject invalid longitude', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg', latitude: 0, longitude: 181 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Longitude');
    });

    it('should reject negative route_position_meters', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg', route_position_meters: -100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('route_position_meters');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      expect(res.status).toBe(401);
    });

    it('should allow multiple photos on same activity', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo1.jpg', route_position_meters: 1000 });

      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo2.jpg', route_position_meters: 2000 });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/activities/:id/photos', () => {
    it('should return photos ordered by route position', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo2.jpg', route_position_meters: 3000 });

      await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo1.jpg', route_position_meters: 1000 });

      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.photos).toHaveLength(2);
      expect(res.body.count).toBe(2);
      // Should be ordered by route_position ascending
      expect(parseFloat(res.body.photos[0].route_position_meters)).toBeLessThan(
        parseFloat(res.body.photos[1].route_position_meters)
      );
    });

    it('should allow viewing photos on public activity', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken3}`);

      expect(res.status).toBe(200);
      expect(res.body.photos).toHaveLength(1);
    });

    it('should allow viewing photos on friends activity by follower', async () => {
      await request(app)
        .post(`/api/activities/${friendsActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      const res = await request(app)
        .get(`/api/activities/${friendsActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
    });

    it('should reject viewing photos on friends activity by non-follower', async () => {
      const res = await request(app)
        .get(`/api/activities/${friendsActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken3}`);

      expect(res.status).toBe(403);
    });

    it('should reject viewing photos on private activity by non-owner', async () => {
      const res = await request(app)
        .get(`/api/activities/${privateActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(403);
    });

    it('should return empty for activity with no photos', async () => {
      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.photos).toHaveLength(0);
    });

    it('should return 404 for non-existent activity', async () => {
      const res = await request(app)
        .get('/api/activities/99999/photos')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/activities/:id/photos/:photoId', () => {
    it('should delete own photo', async () => {
      const createRes = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      const photoId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/photos/${photoId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    it('should not allow deleting another user\'s photo', async () => {
      const createRes = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      const photoId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/photos/${photoId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent photo', async () => {
      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/photos/99999`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(404);
    });

    it('should reject invalid IDs', async () => {
      const res = await request(app)
        .delete(`/api/activities/abc/photos/xyz`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(400);
    });

    it('should verify photo count decreases after deletion', async () => {
      const createRes = await request(app)
        .post(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ photo_url: 'https://example.com/photo.jpg' });

      const photoId = createRes.body.id;

      // Check there's 1 photo
      let listRes = await request(app)
        .get(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`);
      expect(listRes.body.count).toBe(1);

      // Delete it
      await request(app)
        .delete(`/api/activities/${publicActivityId}/photos/${photoId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      // Check there's 0 photos
      listRes = await request(app)
        .get(`/api/activities/${publicActivityId}/photos`)
        .set('Authorization', `Bearer ${authToken1}`);
      expect(listRes.body.count).toBe(0);
    });
  });
});
