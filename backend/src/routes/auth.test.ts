import request from 'supertest';
import app from '../index';
import { pool } from '../db';

describe('Auth API', () => {
  // Clean up test users after each test
  afterEach(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user.password_hash).toBeUndefined(); // Should not return password
      expect(response.body.token).toBeDefined();
    });

    it('should register user with optional fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'fulluser@test.com',
          password: 'password123',
          name: 'Full User',
          bio: 'I love running',
          preferred_sports: ['running', 'swimming'],
        });

      expect(response.status).toBe(201);
      expect(response.body.user.bio).toBe('I love running');
      expect(response.body.user.preferred_sports).toEqual(['running', 'swimming']);
    });

    it('should reject registration without email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123',
          name: 'No Email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
    });

    it('should reject registration without password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nopass@test.com',
          name: 'No Password',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
    });

    it('should reject registration without name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'noname@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Invalid Email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email format');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'short@test.com',
          password: 'pass',
          name: 'Short Password',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 8 characters');
    });

    it('should reject duplicate email', async () => {
      // Register first user
      await request(app).post('/api/auth/register').send({
        email: 'duplicate@test.com',
        password: 'password123',
        name: 'First User',
      });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password456',
          name: 'Second User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User with this email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post('/api/auth/register').send({
        email: 'loginuser@test.com',
        password: 'password123',
        name: 'Login User',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('loginuser@test.com');
      expect(response.body.user.password_hash).toBeUndefined();
      expect(response.body.token).toBeDefined();
    });

    it('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@test.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should reject login with wrong email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and get token
      const response = await request(app).post('/api/auth/register').send({
        email: 'meuser@test.com',
        password: 'password123',
        name: 'Me User',
      });
      authToken = response.body.token;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('meuser@test.com');
      expect(response.body.user.name).toBe('Me User');
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });
});
