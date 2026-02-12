import {
  getAchievements,
  getPersonalRecords,
  getStreaks,
  getSummary,
  checkAchievements,
} from './statsService';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../utils/storage', () => ({
  getToken: jest.fn(() => Promise.resolve('test-token')),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('statsService', () => {
  describe('getAchievements', () => {
    it('should fetch achievements for a user', async () => {
      const mockResponse = {
        earned: [{ achievement_type: 'first_activity', achievement_name: 'First Steps', achieved_at: '2026-01-01' }],
        all: [],
        total_earned: 1,
        total_available: 18,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getAchievements(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/achievements'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.total_earned).toBe(1);
      expect(result.earned[0].achievement_type).toBe('first_activity');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
      await expect(getAchievements(999)).rejects.toThrow('Not found');
    });
  });

  describe('getPersonalRecords', () => {
    it('should fetch personal records', async () => {
      const mockResponse = {
        personal_records: [
          { record_type: '5k', duration_seconds: 1500, sport_type: 'running' },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getPersonalRecords(1);
      expect(result.personal_records.length).toBe(1);
      expect(result.personal_records[0].record_type).toBe('5k');
    });

    it('should filter by sport type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ personal_records: [] }),
      });

      await getPersonalRecords(1, 'running');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sport_type=running'),
        expect.any(Object)
      );
    });
  });

  describe('getStreaks', () => {
    it('should fetch streak data', async () => {
      const mockResponse = {
        current_streak: 5,
        longest_streak: 12,
        total_active_days: 30,
        total_activities: 45,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getStreaks(1);
      expect(result.current_streak).toBe(5);
      expect(result.longest_streak).toBe(12);
      expect(result.total_active_days).toBe(30);
    });
  });

  describe('getSummary', () => {
    it('should fetch weekly summary by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          period: 'week',
          current: { activity_count: 3, total_distance_meters: 15000 },
          previous: { activity_count: 2, total_distance_meters: 10000 },
          comparison: { activity_count_delta: 1, distance_delta: 5000, duration_delta: 1000 },
          sport_breakdown: [],
        }),
      });

      const result = await getSummary(1);
      expect(result.period).toBe('week');
      expect(result.current.activity_count).toBe(3);
    });

    it('should support different periods', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ period: 'month', current: {}, previous: {}, comparison: {}, sport_breakdown: [] }),
      });

      await getSummary(1, 'month');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('period=month'),
        expect.any(Object)
      );
    });
  });

  describe('checkAchievements', () => {
    it('should check achievements with activity data', async () => {
      const mockResponse = {
        new_achievements: [{ achievement_type: 'first_5k', achievement_name: '5K Finisher', is_new: true }],
        new_personal_records: [{ record_type: '5k', new_time: 1500, old_time: null, is_new: true }],
        achievements_count: 1,
        prs_count: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await checkAchievements(1, {
        activity_id: 42,
        sport_type: 'running',
        distance_meters: 5500,
        duration_seconds: 1500,
      });

      expect(result.achievements_count).toBe(1);
      expect(result.prs_count).toBe(1);
      expect(result.new_achievements[0].achievement_name).toBe('5K Finisher');
      expect(result.new_personal_records[0].record_type).toBe('5k');
    });

    it('should send POST request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ new_achievements: [], new_personal_records: [], achievements_count: 0, prs_count: 0 }),
      });

      await checkAchievements(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/check-achievements'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
