import request from 'supertest';
import app from '../index';
import { pool } from '../db';
import bcrypt from 'bcrypt';

describe('Stats API — Achievements, PRs, Streaks, Summaries', () => {
  let authToken1: string;
  let authToken2: string;
  let userId1: number;
  let userId2: number;

  beforeEach(async () => {
    const ts = Date.now();
    const email1 = `stats-u1-${ts}@test.com`;
    const email2 = `stats-u2-${ts}@test.com`;
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      [email1, hashedPassword, 'Stats User 1']
    );
    userId1 = user1.rows[0].id;

    const user2 = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      [email2, hashedPassword, 'Stats User 2']
    );
    userId2 = user2.rows[0].id;

    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: email1, password: 'password123' });
    authToken1 = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: email2, password: 'password123' });
    authToken2 = login2.body.token;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM personal_records WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM user_achievements WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM activity_photos WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM activity_likes WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM activity_comments WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM activities WHERE user_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM follows WHERE follower_id IN ($1, $2) OR following_id IN ($1, $2)', [userId1, userId2]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId1, userId2]);
  });

  // --- Helper to create activity ---
  async function createActivity(token: string, overrides: Record<string, unknown> = {}) {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sport_type: 'running',
        title: 'Test Run',
        start_time: new Date().toISOString(),
        duration_seconds: 1800,
        distance_meters: 5000,
        visibility: 'public',
        ...overrides,
      });
    return res.body;
  }

  // ========== ACHIEVEMENTS ==========

  describe('GET /api/users/:id/achievements', () => {
    it('should return empty earned list for new user', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/achievements`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.earned).toEqual([]);
      expect(res.body.total_earned).toBe(0);
      expect(res.body.total_available).toBeGreaterThan(0);
      expect(Array.isArray(res.body.all)).toBe(true);
      // All achievements should be unearned
      const allUnearned = res.body.all.every((a: { earned: boolean }) => !a.earned);
      expect(allUnearned).toBe(true);
    });

    it('should return all available achievement definitions', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/achievements`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.all.length).toBeGreaterThanOrEqual(15);

      // Verify each definition has required fields
      for (const ach of res.body.all) {
        expect(ach).toHaveProperty('achievement_type');
        expect(ach).toHaveProperty('achievement_name');
        expect(ach).toHaveProperty('achievement_description');
        expect(ach).toHaveProperty('earned');
        expect(typeof ach.achievement_type).toBe('string');
        expect(typeof ach.achievement_name).toBe('string');
        expect(typeof ach.earned).toBe('boolean');
      }
    });

    it('should allow viewing another user achievements', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/achievements`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('earned');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/achievements`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/:id/check-achievements', () => {
    it('should award first_activity achievement after first activity', async () => {
      const activity = await createActivity(authToken1);

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ activity_id: activity.id });

      expect(res.status).toBe(200);
      expect(res.body.achievements_count).toBeGreaterThanOrEqual(1);

      const firstActivity = res.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'first_activity'
      );
      expect(firstActivity).toBeDefined();
      expect(firstActivity.achievement_name).toBe('First Steps');
      expect(firstActivity.is_new).toBe(true);
    });

    it('should award first_run achievement for running activity', async () => {
      await createActivity(authToken1, { sport_type: 'running' });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      const firstRun = res.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'first_run'
      );
      expect(firstRun).toBeDefined();
      expect(firstRun.achievement_name).toBe('Runner');
    });

    it('should award first_5k achievement for 5K+ run', async () => {
      const activity = await createActivity(authToken1, { distance_meters: 5200 });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ activity_id: activity.id });

      const first5k = res.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'first_5k'
      );
      expect(first5k).toBeDefined();
      expect(first5k.achievement_name).toBe('5K Finisher');
    });

    it('should NOT award first_5k for shorter run', async () => {
      await createActivity(authToken1, { distance_meters: 3000 });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      const first5k = res.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'first_5k'
      );
      expect(first5k).toBeUndefined();
    });

    it('should not re-award already earned achievements', async () => {
      await createActivity(authToken1);

      // First check
      const res1 = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      const firstCheckCount = res1.body.achievements_count;
      expect(firstCheckCount).toBeGreaterThanOrEqual(1);

      // Second activity + second check
      await createActivity(authToken1);
      const res2 = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      // first_activity should NOT appear again (already earned)
      const firstActivity = res2.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'first_activity'
      );
      expect(firstActivity).toBeUndefined();
    });

    it('should detect PRs when activity data provided', async () => {
      const activity = await createActivity(authToken1, {
        distance_meters: 5500,
        duration_seconds: 1650, // ~5:00/km pace
        start_time: new Date().toISOString(),
      });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 1650,
          start_time: new Date().toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.prs_count).toBeGreaterThanOrEqual(1);

      // Should have at least 5k PR and fastest_pace PR
      const prTypes = res.body.new_personal_records.map((p: { record_type: string }) => p.record_type);
      expect(prTypes).toContain('5k');
      expect(prTypes).toContain('fastest_pace');
      expect(prTypes).toContain('longest_run');
      expect(prTypes).toContain('1k');
    });

    it('should detect improvement on existing PR', async () => {
      // First run — sets initial PR
      const activity1 = await createActivity(authToken1, {
        distance_meters: 5500,
        duration_seconds: 1800,
        start_time: new Date(Date.now() - 86400000).toISOString(),
      });

      await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity1.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 1800,
        });

      // Faster run — should improve 5k PR
      const activity2 = await createActivity(authToken1, {
        distance_meters: 5500,
        duration_seconds: 1500,
        start_time: new Date().toISOString(),
      });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity2.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 1500,
        });

      const pr5k = res.body.new_personal_records.find((p: { record_type: string }) => p.record_type === '5k');
      expect(pr5k).toBeDefined();
      expect(pr5k.old_time).not.toBeNull();
      expect(pr5k.new_time).toBeLessThan(pr5k.old_time);
    });

    it('should NOT set PR for slower run', async () => {
      // Fast run first
      const activity1 = await createActivity(authToken1, {
        distance_meters: 5500,
        duration_seconds: 1500,
        start_time: new Date(Date.now() - 86400000).toISOString(),
      });

      await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity1.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 1500,
        });

      // Slower run — should NOT replace PR
      const activity2 = await createActivity(authToken1, {
        distance_meters: 5500,
        duration_seconds: 2000,
        start_time: new Date().toISOString(),
      });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity2.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 2000,
        });

      const pr5k = res.body.new_personal_records.find((p: { record_type: string }) => p.record_type === '5k');
      expect(pr5k).toBeUndefined();
    });

    it('should reject checking achievements for another user', async () => {
      const res = await request(app)
        .post(`/api/users/${userId2}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should award five_activities after 5 activities', async () => {
      for (let i = 0; i < 5; i++) {
        await createActivity(authToken1);
      }

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      const fiveActivities = res.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'five_activities'
      );
      expect(fiveActivities).toBeDefined();
      expect(fiveActivities.achievement_name).toBe('Getting Started');
    });

    it('should award total_50km after cumulative 50km', async () => {
      // Create activities totaling > 50km
      for (let i = 0; i < 6; i++) {
        await createActivity(authToken1, { distance_meters: 10000, duration_seconds: 3600 });
      }

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({});

      const total50k = res.body.new_achievements.find(
        (a: { achievement_type: string }) => a.achievement_type === 'total_50km'
      );
      expect(total50k).toBeDefined();
      expect(total50k.achievement_name).toBe('50K Club');
    });

    it('should not award PRs for non-cardio sports', async () => {
      const activity = await createActivity(authToken1, {
        sport_type: 'weightlifting',
        distance_meters: null,
        duration_seconds: 3600,
      });

      const res = await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity.id,
          sport_type: 'weightlifting',
          distance_meters: 0,
          duration_seconds: 3600,
        });

      expect(res.body.prs_count).toBe(0);
    });
  });

  // ========== PERSONAL RECORDS ==========

  describe('GET /api/users/:id/personal-records', () => {
    it('should return empty for new user', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/personal-records`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.personal_records).toEqual([]);
    });

    it('should return PRs after they are set', async () => {
      const activity = await createActivity(authToken1, {
        distance_meters: 5500,
        duration_seconds: 1650,
      });

      // Trigger PR detection
      await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 1650,
        });

      const res = await request(app)
        .get(`/api/users/${userId1}/personal-records`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.personal_records.length).toBeGreaterThanOrEqual(3);

      // Verify each PR has required fields
      for (const pr of res.body.personal_records) {
        expect(pr).toHaveProperty('record_type');
        expect(pr).toHaveProperty('duration_seconds');
        expect(pr).toHaveProperty('sport_type');
        expect(pr).toHaveProperty('achieved_at');
        expect(pr.sport_type).toBe('running');
      }
    });

    it('should filter PRs by sport_type', async () => {
      const activity = await createActivity(authToken1, {
        sport_type: 'running',
        distance_meters: 5500,
        duration_seconds: 1650,
      });

      await request(app)
        .post(`/api/users/${userId1}/check-achievements`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          activity_id: activity.id,
          sport_type: 'running',
          distance_meters: 5500,
          duration_seconds: 1650,
        });

      const res = await request(app)
        .get(`/api/users/${userId1}/personal-records?sport_type=biking`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.personal_records).toEqual([]);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/personal-records`);

      expect(res.status).toBe(401);
    });
  });

  // ========== STREAKS ==========

  describe('GET /api/users/:id/streaks', () => {
    it('should return zero streaks for new user', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.current_streak).toBe(0);
      expect(res.body.longest_streak).toBe(0);
      expect(res.body.total_active_days).toBe(0);
      expect(res.body.total_activities).toBe(0);
    });

    it('should count current streak of 1 for activity today', async () => {
      await createActivity(authToken1, {
        start_time: new Date().toISOString(),
      });

      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.current_streak).toBe(1);
      expect(res.body.longest_streak).toBe(1);
      expect(res.body.total_active_days).toBe(1);
      expect(res.body.total_activities).toBe(1);
    });

    it('should count multi-day streak', async () => {
      const now = new Date();
      // Today
      await createActivity(authToken1, { start_time: now.toISOString() });
      // Yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      await createActivity(authToken1, { start_time: yesterday.toISOString() });
      // Day before yesterday
      const dayBefore = new Date(now);
      dayBefore.setDate(dayBefore.getDate() - 2);
      await createActivity(authToken1, { start_time: dayBefore.toISOString() });

      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.current_streak).toBe(3);
      expect(res.body.longest_streak).toBe(3);
      expect(res.body.total_active_days).toBe(3);
    });

    it('should break streak with gap', async () => {
      const now = new Date();
      // Today
      await createActivity(authToken1, { start_time: now.toISOString() });
      // 3 days ago (gap)
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      await createActivity(authToken1, { start_time: threeDaysAgo.toISOString() });

      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.current_streak).toBe(1);
      expect(res.body.total_active_days).toBe(2);
    });

    it('should track longest streak separately from current', async () => {
      const now = new Date();
      // Old streak: 4 days, 10 days ago
      for (let i = 13; i >= 10; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        await createActivity(authToken1, { start_time: d.toISOString() });
      }
      // Current streak: 2 days
      await createActivity(authToken1, { start_time: now.toISOString() });
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      await createActivity(authToken1, { start_time: yesterday.toISOString() });

      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.current_streak).toBe(2);
      expect(res.body.longest_streak).toBe(4);
    });

    it('should count multiple activities on same day as 1 day', async () => {
      const now = new Date();
      await createActivity(authToken1, { start_time: now.toISOString() });
      await createActivity(authToken1, { start_time: now.toISOString() });
      await createActivity(authToken1, { start_time: now.toISOString() });

      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.body.current_streak).toBe(1);
      expect(res.body.total_active_days).toBe(1);
      expect(res.body.total_activities).toBe(3);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/streaks`);
      expect(res.status).toBe(401);
    });
  });

  // ========== SUMMARY ==========

  describe('GET /api/users/:id/summary', () => {
    it('should return zero stats for new user', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=week`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('week');
      expect(res.body.current.activity_count).toBe(0);
      expect(res.body.current.total_duration_seconds).toBe(0);
      expect(res.body.current.total_distance_meters).toBe(0);
      expect(res.body.current.active_days).toBe(0);
      expect(res.body.sport_breakdown).toEqual([]);
    });

    it('should calculate weekly summary with activities', async () => {
      // Create activities within last 7 days
      await createActivity(authToken1, {
        start_time: new Date().toISOString(),
        duration_seconds: 1800,
        distance_meters: 5000,
        sport_type: 'running',
      });
      await createActivity(authToken1, {
        start_time: new Date().toISOString(),
        duration_seconds: 3600,
        distance_meters: 10000,
        sport_type: 'biking',
      });

      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=week`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.current.activity_count).toBe(2);
      expect(res.body.current.total_duration_seconds).toBe(5400);
      expect(res.body.current.total_distance_meters).toBe(15000);
      expect(res.body.current.active_days).toBe(1);
      expect(res.body.current.sport_types_count).toBe(2);
    });

    it('should provide sport breakdown', async () => {
      await createActivity(authToken1, {
        sport_type: 'running',
        duration_seconds: 1800,
        distance_meters: 5000,
      });
      await createActivity(authToken1, {
        sport_type: 'running',
        duration_seconds: 2000,
        distance_meters: 6000,
      });
      await createActivity(authToken1, {
        sport_type: 'yoga',
        duration_seconds: 3600,
        distance_meters: 0,
      });

      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=week`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.body.sport_breakdown.length).toBe(2);
      const running = res.body.sport_breakdown.find((s: { sport_type: string }) => s.sport_type === 'running');
      expect(running).toBeDefined();
      expect(running.count).toBe(2);
      expect(running.duration_seconds).toBe(3800);
      expect(running.distance_meters).toBe(11000);
    });

    it('should calculate comparison with previous period', async () => {
      // Activity in current week
      await createActivity(authToken1, {
        start_time: new Date().toISOString(),
        duration_seconds: 1800,
        distance_meters: 5000,
      });

      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=week`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.body).toHaveProperty('comparison');
      expect(res.body.comparison).toHaveProperty('activity_count_delta');
      expect(res.body.comparison).toHaveProperty('duration_delta');
      expect(res.body.comparison).toHaveProperty('distance_delta');
      expect(res.body.comparison.activity_count_delta).toBe(1); // 1 this week - 0 last week
    });

    it('should support month period', async () => {
      await createActivity(authToken1);

      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=month`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('month');
      expect(res.body.current.activity_count).toBe(1);
    });

    it('should support year period', async () => {
      await createActivity(authToken1);

      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=year`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('year');
    });

    it('should reject invalid period', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/summary?period=decade`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid period');
    });

    it('should default to week if no period specified', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/summary`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('week');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/users/${userId1}/summary`);
      expect(res.status).toBe(401);
    });
  });
});
