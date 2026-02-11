import request from 'supertest';
import app from '../index';
import { pool } from '../db';
import bcrypt from 'bcrypt';

describe('Interactions API', () => {
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
      ['interact-user1@test.com', hashedPassword, 'Interact User 1']
    );
    userId1 = user1.rows[0].id;

    const user2 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['interact-user2@test.com', hashedPassword, 'Interact User 2']
    );
    userId2 = user2.rows[0].id;

    const user3 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['interact-user3@test.com', hashedPassword, 'Interact User 3']
    );
    userId3 = user3.rows[0].id;

    // User2 follows User1 (for friends-only tests)
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [userId2, userId1]);

    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'interact-user1@test.com', password: 'password123' });
    authToken1 = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'interact-user2@test.com', password: 'password123' });
    authToken2 = login2.body.token;

    const login3 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'interact-user3@test.com', password: 'password123' });
    authToken3 = login3.body.token;

    // Create test activities
    const pub = await pool.query(
      `INSERT INTO activities (user_id, sport_type, start_time, visibility, title)
       VALUES ($1, 'running', NOW(), 'public', 'Public Run') RETURNING id`,
      [userId1]
    );
    publicActivityId = pub.rows[0].id;

    const friends = await pool.query(
      `INSERT INTO activities (user_id, sport_type, start_time, visibility, title)
       VALUES ($1, 'running', NOW(), 'friends', 'Friends Run') RETURNING id`,
      [userId1]
    );
    friendsActivityId = friends.rows[0].id;

    const priv = await pool.query(
      `INSERT INTO activities (user_id, sport_type, start_time, visibility, title)
       VALUES ($1, 'running', NOW(), 'private', 'Private Run') RETURNING id`,
      [userId1]
    );
    privateActivityId = priv.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM activity_comments WHERE user_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM activity_likes WHERE user_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM activities WHERE user_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM follows WHERE follower_id IN ($1, $2, $3) OR following_id IN ($1, $2, $3)', [userId1, userId2, userId3]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [userId1, userId2, userId3]);
  });

  // --- LIKES ---

  describe('POST /api/activities/:id/like', () => {
    it('should like a public activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(201);
      expect(res.body.activity_id).toBe(publicActivityId);
      expect(res.body.user_id).toBe(userId2);
      expect(res.body.like_type).toBe('like');
    });

    it('should high-five an activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'high_five' });

      expect(res.status).toBe(201);
      expect(res.body.like_type).toBe('high_five');
    });

    it('should default to like type when not specified', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.like_type).toBe('like');
    });

    it('should allow both like and high-five on same activity', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'high_five' });

      expect(res.status).toBe(201);
    });

    it('should allow liking own activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(201);
    });

    it('should reject duplicate like of same type', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already liked');
    });

    it('should reject invalid like_type', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'super_like' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid like_type');
    });

    it('should reject like on non-existent activity', async () => {
      const res = await request(app)
        .post('/api/activities/99999/like')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(404);
    });

    it('should reject like on private activity by non-owner and not persist', async () => {
      const res = await request(app)
        .post(`/api/activities/${privateActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(403);

      // Verify no like was persisted in the database
      const dbCheck = await pool.query(
        'SELECT COUNT(*)::int as count FROM activity_likes WHERE activity_id = $1 AND user_id = $2',
        [privateActivityId, userId2]
      );
      expect(dbCheck.rows[0].count).toBe(0);
    });

    it('should allow like on friends activity by follower', async () => {
      const res = await request(app)
        .post(`/api/activities/${friendsActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(201);
    });

    it('should reject like on friends activity by non-follower', async () => {
      const res = await request(app)
        .post(`/api/activities/${friendsActivityId}/like`)
        .set('Authorization', `Bearer ${authToken3}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid activity ID', async () => {
      const res = await request(app)
        .post('/api/activities/abc/like')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/activities/:id/like', () => {
    it('should unlike an activity', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('removed');
    });

    it('should return 404 when unlike without prior like', async () => {
      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(404);
    });

    it('should allow re-liking after unlike', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      await request(app)
        .delete(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/activities/:id/likes', () => {
    it('should return likes with user info', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ like_type: 'like' });

      await request(app)
        .post(`/api/activities/${publicActivityId}/like`)
        .set('Authorization', `Bearer ${authToken3}`)
        .send({ like_type: 'high_five' });

      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/likes`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.likes).toHaveLength(2);
      expect(res.body.like_count).toBe(1);
      expect(res.body.high_five_count).toBe(1);
      expect(res.body.total).toBe(2);
      expect(res.body.likes[0]).toHaveProperty('user');
      expect(res.body.likes[0].user).toHaveProperty('name');
    });

    it('should return empty for activity with no likes', async () => {
      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/likes`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.likes).toHaveLength(0);
      expect(res.body.like_count).toBe(0);
      expect(res.body.high_five_count).toBe(0);
    });

    it('should return 404 for non-existent activity', async () => {
      const res = await request(app)
        .get('/api/activities/99999/likes')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(404);
    });
  });

  // --- COMMENTS ---

  describe('POST /api/activities/:id/comments', () => {
    it('should create a comment on public activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'Great run!' });

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Great run!');
      expect(res.body.activity_id).toBe(publicActivityId);
      expect(res.body.user).toHaveProperty('name', 'Interact User 2');
    });

    it('should allow multiple comments from same user', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'First comment' });

      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'Second comment' });

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Second comment');
    });

    it('should reject empty comment', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should reject whitespace-only comment', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
    });

    it('should reject comment on non-existent activity', async () => {
      const res = await request(app)
        .post('/api/activities/99999/comments')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'Nice!' });

      expect(res.status).toBe(404);
    });

    it('should reject comment on private activity by non-owner and not create it in DB', async () => {
      const res = await request(app)
        .post(`/api/activities/${privateActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'Nice!' });

      expect(res.status).toBe(403);

      // Verify the comment was NOT created in the database
      const dbCheck = await pool.query(
        'SELECT COUNT(*)::int as count FROM activity_comments WHERE activity_id = $1 AND user_id = $2',
        [privateActivityId, userId2]
      );
      expect(dbCheck.rows[0].count).toBe(0);
    });

    it('should allow comment on friends activity by follower', async () => {
      const res = await request(app)
        .post(`/api/activities/${friendsActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'Nice friends run!' });

      expect(res.status).toBe(201);
    });

    it('should reject comment on friends activity by non-follower', async () => {
      const res = await request(app)
        .post(`/api/activities/${friendsActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken3}`)
        .send({ text: 'Nice!' });

      expect(res.status).toBe(403);
    });

    it('should allow commenting on own activity', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ text: 'Self comment' });

      expect(res.status).toBe(201);
    });

    it('should trim whitespace from comment text', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: '  Great run!  ' });

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Great run!');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .send({ text: 'Great!' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/activities/:id/comments', () => {
    it('should return comments in chronological order', async () => {
      await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'First!' });

      await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken3}`)
        .send({ text: 'Second!' });

      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(2);
      expect(res.body.count).toBe(2);
      expect(res.body.comments[0].text).toBe('First!');
      expect(res.body.comments[1].text).toBe('Second!');
      expect(res.body.comments[0].user).toHaveProperty('name');
    });

    it('should return empty for activity with no comments', async () => {
      const res = await request(app)
        .get(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(0);
      expect(res.body.count).toBe(0);
    });

    it('should return 404 for non-existent activity', async () => {
      const res = await request(app)
        .get('/api/activities/99999/comments')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/activities/:id/comments/:commentId', () => {
    it('should delete own comment', async () => {
      const createRes = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'To be deleted' });

      const commentId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    it('should not allow deleting another user\'s comment', async () => {
      const createRes = await request(app)
        .post(`/api/activities/${publicActivityId}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ text: 'My comment' });

      const commentId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken3}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('own comments');
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .delete(`/api/activities/${publicActivityId}/comments/99999`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(404);
    });

    it('should reject invalid IDs', async () => {
      const res = await request(app)
        .delete(`/api/activities/abc/comments/xyz`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(400);
    });
  });
});
