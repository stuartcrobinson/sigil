import request from 'supertest';
import app from './index';

describe('GET /', () => {
  it('returns 200 and Hello Sigil message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Hello Sigil' });
  });
});

describe('GET /api/health', () => {
  it('returns 200 and health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      environment: expect.any(String),
    });
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
