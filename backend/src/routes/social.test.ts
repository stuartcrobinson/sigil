import request from 'supertest';
import app from '../index';
import { pool } from '../db';

describe('Social API', () => {
  let user1Id: number;
  let user1Token: string;
  let user2Id: number;
  let user3Id: number;

  // Use unique email prefix for this test suite to avoid conflicts with auth.test.ts
  const emailPrefix = 'social';

  beforeEach(async () => {
    // Create test users before each test for isolation
    const user1 = await request(app).post('/api/auth/register').send({
      email: `${emailPrefix}-user1@test.com`,
      password: 'password123',
      name: 'Alice Smith',
    });
    user1Id = user1.body.user.id;
    user1Token = user1.body.token;

    const user2 = await request(app).post('/api/auth/register').send({
      email: `${emailPrefix}-user2@test.com`,
      password: 'password123',
      name: 'Bob Jones',
    });
    user2Id = user2.body.user.id;

    const user3 = await request(app).post('/api/auth/register').send({
      email: `${emailPrefix}-user3@test.com`,
      password: 'password123',
      name: 'Charlie Brown',
    });
    user3Id = user3.body.user.id;
  });

  afterEach(async () => {
    // Clean up follows and users after each test for complete isolation
    await pool.query("DELETE FROM follows WHERE follower_id IN (SELECT id FROM users WHERE email LIKE $1)", [`${emailPrefix}-%@test.com`]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${emailPrefix}-%@test.com`]);
  });

  describe('POST /api/social/users/:id/follow', () => {
    it('should allow user to follow another user', async () => {
      const response = await request(app)
        .post(`/api/social/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Successfully followed user');
    });

    it('should reject follow without authentication', async () => {
      const response = await request(app).post(`/api/social/users/${user2Id}/follow`);

      expect(response.status).toBe(401);
    });

    it('should reject following yourself', async () => {
      const response = await request(app)
        .post(`/api/social/users/${user1Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot follow yourself');
    });

    it('should reject following non-existent user', async () => {
      const response = await request(app)
        .post('/api/social/users/99999/follow')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should reject following same user twice', async () => {
      // First follow
      await request(app)
        .post(`/api/social/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);

      // Second follow attempt
      const response = await request(app)
        .post(`/api/social/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You are already following this user');
    });

    it('should reject invalid user ID', async () => {
      const response = await request(app)
        .post('/api/social/users/invalid/follow')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('DELETE /api/social/users/:id/unfollow', () => {
    beforeEach(async () => {
      // User1 follows User2
      await request(app)
        .post(`/api/social/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);
    });

    it('should allow user to unfollow another user', async () => {
      const response = await request(app)
        .delete(`/api/social/users/${user2Id}/unfollow`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully unfollowed user');
    });

    it('should reject unfollow without authentication', async () => {
      const response = await request(app).delete(`/api/social/users/${user2Id}/unfollow`);

      expect(response.status).toBe(401);
    });

    it('should reject unfollowing user not followed', async () => {
      const response = await request(app)
        .delete(`/api/social/users/${user3Id}/unfollow`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Follow relationship not found');
    });

    it('should reject invalid user ID', async () => {
      const response = await request(app)
        .delete('/api/social/users/invalid/unfollow')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('GET /api/social/users/:id/followers', () => {
    beforeEach(async () => {
      // User1 and User3 follow User2
      await request(app)
        .post(`/api/social/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);

      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [
        user3Id,
        user2Id,
      ]);
    });

    it('should get list of followers', async () => {
      const response = await request(app).get(`/api/social/users/${user2Id}/followers`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.followers).toHaveLength(2);

      const followerNames = response.body.followers.map((f: any) => f.name).sort();
      expect(followerNames).toEqual(['Alice Smith', 'Charlie Brown']);

      // Check follower structure
      const follower = response.body.followers[0];
      expect(follower).toHaveProperty('id');
      expect(follower).toHaveProperty('name');
      expect(follower).toHaveProperty('email');
      expect(follower).toHaveProperty('followed_at');
      expect(follower).not.toHaveProperty('password_hash');
    });

    it('should return empty list for user with no followers', async () => {
      const response = await request(app).get(`/api/social/users/${user1Id}/followers`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.followers).toHaveLength(0);
    });

    it('should reject invalid user ID', async () => {
      const response = await request(app).get('/api/social/users/invalid/followers');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('GET /api/social/users/:id/following', () => {
    beforeEach(async () => {
      // User1 follows User2 and User3
      await request(app)
        .post(`/api/social/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);

      await request(app)
        .post(`/api/social/users/${user3Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);
    });

    it('should get list of users being followed', async () => {
      const response = await request(app).get(`/api/social/users/${user1Id}/following`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.following).toHaveLength(2);

      const followingNames = response.body.following.map((f: any) => f.name).sort();
      expect(followingNames).toEqual(['Bob Jones', 'Charlie Brown']);

      // Check following structure
      const following = response.body.following[0];
      expect(following).toHaveProperty('id');
      expect(following).toHaveProperty('name');
      expect(following).toHaveProperty('email');
      expect(following).toHaveProperty('followed_at');
      expect(following).not.toHaveProperty('password_hash');
    });

    it('should return empty list for user not following anyone', async () => {
      const response = await request(app).get(`/api/social/users/${user2Id}/following`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.following).toHaveLength(0);
    });

    it('should reject invalid user ID', async () => {
      const response = await request(app).get('/api/social/users/invalid/following');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('GET /api/social/search', () => {
    it('should search users by name', async () => {
      const response = await request(app).get('/api/social/search?q=Alice');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThanOrEqual(1);
      expect(response.body.users.some((u: any) => u.name === 'Alice Smith')).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(app).get('/api/social/search?q=social-user2@');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThanOrEqual(1);
      expect(response.body.users.some((u: any) => u.email === `${emailPrefix}-user2@test.com`)).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const response = await request(app).get('/api/social/search?q=CHARLIE');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThanOrEqual(1);
      expect(response.body.users.some((u: any) => u.name === 'Charlie Brown')).toBe(true);
    });

    it('should return empty results for no matches', async () => {
      const response = await request(app).get('/api/social/search?q=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.users).toHaveLength(0);
    });

    it('should reject empty search query', async () => {
      const response = await request(app).get('/api/social/search?q=');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search query is required');
    });

    it('should reject missing search query', async () => {
      const response = await request(app).get('/api/social/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search query is required');
    });

    it('should not expose password hashes', async () => {
      const response = await request(app).get('/api/social/search?q=Alice');

      expect(response.status).toBe(200);
      // Guard: ensure results exist before checking properties (empty array would vacuously pass)
      expect(response.body.users.length).toBeGreaterThan(0);
      // Verify ALL results, not just the first
      response.body.users.forEach((user: any) => {
        expect(user).not.toHaveProperty('password_hash');
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
      });
    });
  });
});
