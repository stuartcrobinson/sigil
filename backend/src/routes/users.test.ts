import request from 'supertest';
import app from '../index';
import { pool } from '../db';

describe('Users API', () => {
  let userId: number;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user
    const response = await request(app).post('/api/auth/register').send({
      email: 'testuser@test.com',
      password: 'password123',
      name: 'Test User',
      bio: 'I love fitness',
      preferred_sports: ['running', 'swimming'],
    });

    userId = response.body.user.id;
    authToken = response.body.token;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe('testuser@test.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.bio).toBe('I love fitness');
      expect(response.body.user.preferred_sports).toEqual(['running', 'swimming']);
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app).get('/api/users/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          bio: 'Updated bio',
          preferred_sports: ['weightlifting', 'yoga'],
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe('Updated Name');
      expect(response.body.user.bio).toBe('Updated bio');
      expect(response.body.user.preferred_sports).toEqual(['weightlifting', 'yoga']);
    });

    it('should update only specified fields', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Partial Update',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('Partial Update');
      // Other fields should remain unchanged
      expect(response.body.user.email).toBe('testuser@test.com');
    });

    it('should reject update without token', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send({
          name: 'No Auth',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should reject update of other user profile', async () => {
      // Create another user
      const otherUser = await request(app).post('/api/auth/register').send({
        email: 'otheruser@test.com',
        password: 'password123',
        name: 'Other User',
      });

      const response = await request(app)
        .put(`/api/users/${otherUser.body.user.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Trying to update someone else',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You can only update your own profile');
    });

    it('should reject update with no fields', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .put('/api/users/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid ID',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });
});
