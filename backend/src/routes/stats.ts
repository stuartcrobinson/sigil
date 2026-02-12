import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// --- Achievement Definitions ---

interface AchievementDef {
  type: string;
  name: string;
  description: string;
  check: (ctx: { userId: number; activityId?: number }) => Promise<boolean>;
  metadata?: (ctx: { userId: number; activityId?: number }) => Promise<Record<string, unknown>>;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    type: 'first_activity',
    name: 'First Steps',
    description: 'Completed your first activity',
    check: async ({ userId }) => {
      const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1', [userId]);
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'first_run',
    name: 'Runner',
    description: 'Completed your first run',
    check: async ({ userId }) => {
      const r = await pool.query("SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND sport_type = 'running'", [userId]);
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'first_5k',
    name: '5K Finisher',
    description: 'Completed a 5K run (5,000m+)',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking') AND distance_meters >= 5000",
        [userId]
      );
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'first_10k',
    name: '10K Finisher',
    description: 'Completed a 10K run (10,000m+)',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking') AND distance_meters >= 10000",
        [userId]
      );
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'half_marathon',
    name: 'Half Marathoner',
    description: 'Completed a half marathon (21,097m+)',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking') AND distance_meters >= 21097",
        [userId]
      );
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'marathon',
    name: 'Marathoner',
    description: 'Completed a marathon (42,195m+)',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking') AND distance_meters >= 42195",
        [userId]
      );
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'total_50km',
    name: '50K Club',
    description: 'Logged 50 km total distance',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COALESCE(SUM(distance_meters), 0)::numeric AS total FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking', 'biking')",
        [userId]
      );
      return parseFloat(r.rows[0].total) >= 50000;
    },
  },
  {
    type: 'total_100km',
    name: '100K Club',
    description: 'Logged 100 km total distance',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COALESCE(SUM(distance_meters), 0)::numeric AS total FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking', 'biking')",
        [userId]
      );
      return parseFloat(r.rows[0].total) >= 100000;
    },
  },
  {
    type: 'total_500km',
    name: '500K Club',
    description: 'Logged 500 km total distance',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COALESCE(SUM(distance_meters), 0)::numeric AS total FROM activities WHERE user_id = $1 AND sport_type IN ('running', 'walking', 'biking')",
        [userId]
      );
      return parseFloat(r.rows[0].total) >= 500000;
    },
  },
  {
    type: 'streak_7',
    name: 'Week Warrior',
    description: 'Achieved a 7-day activity streak',
    check: async ({ userId }) => {
      const streak = await calculateCurrentStreak(userId);
      return streak >= 7;
    },
  },
  {
    type: 'streak_30',
    name: 'Monthly Master',
    description: 'Achieved a 30-day activity streak',
    check: async ({ userId }) => {
      const streak = await calculateCurrentStreak(userId);
      return streak >= 30;
    },
  },
  {
    type: 'early_bird',
    name: 'Early Bird',
    description: 'Completed an activity before 7 AM',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND EXTRACT(HOUR FROM start_time) < 7",
        [userId]
      );
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'night_owl',
    name: 'Night Owl',
    description: 'Completed an activity after 9 PM',
    check: async ({ userId }) => {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1 AND EXTRACT(HOUR FROM start_time) >= 21",
        [userId]
      );
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'five_activities',
    name: 'Getting Started',
    description: 'Completed 5 activities',
    check: async ({ userId }) => {
      const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1', [userId]);
      return r.rows[0].cnt >= 5;
    },
  },
  {
    type: 'ten_activities',
    name: 'Dedicated',
    description: 'Completed 10 activities',
    check: async ({ userId }) => {
      const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1', [userId]);
      return r.rows[0].cnt >= 10;
    },
  },
  {
    type: 'fifty_activities',
    name: 'Committed',
    description: 'Completed 50 activities',
    check: async ({ userId }) => {
      const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM activities WHERE user_id = $1', [userId]);
      return r.rows[0].cnt >= 50;
    },
  },
  {
    type: 'photo_first',
    name: 'Shutterbug',
    description: 'Took your first activity photo',
    check: async ({ userId }) => {
      const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM activity_photos WHERE user_id = $1', [userId]);
      return r.rows[0].cnt >= 1;
    },
  },
  {
    type: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Followed 5 other athletes',
    check: async ({ userId }) => {
      const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM follows WHERE follower_id = $1', [userId]);
      return r.rows[0].cnt >= 5;
    },
  },
];

// --- Streak Calculation ---

async function calculateCurrentStreak(userId: number): Promise<number> {
  // Get distinct dates of activities, ordered descending
  const result = await pool.query(
    `SELECT DISTINCT DATE(start_time) AS activity_date
     FROM activities WHERE user_id = $1
     ORDER BY activity_date DESC`,
    [userId]
  );

  if (result.rows.length === 0) return 0;

  const dates = result.rows.map((r: { activity_date: string }) => new Date(r.activity_date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecent = new Date(dates[0]);
  mostRecent.setHours(0, 0, 0, 0);

  // Streak must include today or yesterday to be "current"
  const diffDays = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const gap = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (gap === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

async function calculateLongestStreak(userId: number): Promise<number> {
  const result = await pool.query(
    `SELECT DISTINCT DATE(start_time) AS activity_date
     FROM activities WHERE user_id = $1
     ORDER BY activity_date ASC`,
    [userId]
  );

  if (result.rows.length === 0) return 0;

  const dates = result.rows.map((r: { activity_date: string }) => new Date(r.activity_date));
  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const gap = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (gap === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (gap > 1) {
      current = 1;
    }
    // gap === 0 means same day, skip
  }

  return longest;
}

// --- PR Detection ---

interface PRRecord {
  record_type: string;
  distance_meters: number;
  threshold: number; // minimum distance for this PR
}

const PR_DISTANCES: PRRecord[] = [
  { record_type: '1k', distance_meters: 1000, threshold: 1000 },
  { record_type: '5k', distance_meters: 5000, threshold: 5000 },
  { record_type: '10k', distance_meters: 10000, threshold: 10000 },
  { record_type: 'half_marathon', distance_meters: 21097, threshold: 21097 },
  { record_type: 'marathon', distance_meters: 42195, threshold: 42195 },
  { record_type: 'longest_run', distance_meters: 0, threshold: 0 },
  { record_type: 'fastest_pace', distance_meters: 0, threshold: 1000 }, // min 1km for pace PR
];

async function detectAndSavePRs(
  userId: number,
  activityId: number,
  sportType: string,
  distanceMeters: number,
  durationSeconds: number,
  startTime: string
): Promise<Array<{ record_type: string; new_time: number; old_time: number | null; is_new: boolean }>> {
  const newPRs: Array<{ record_type: string; new_time: number; old_time: number | null; is_new: boolean }> = [];

  if (!['running', 'walking', 'biking'].includes(sportType)) return newPRs;
  if (!distanceMeters || !durationSeconds || durationSeconds <= 0) return newPRs;

  const paceSecondsPerKm = (durationSeconds / distanceMeters) * 1000;

  // Check distance-based PRs (best time for standard distances)
  for (const pr of PR_DISTANCES) {
    if (pr.record_type === 'longest_run') {
      // Longest run — compare distance
      const existing = await pool.query(
        'SELECT * FROM personal_records WHERE user_id = $1 AND record_type = $2 AND sport_type = $3',
        [userId, 'longest_run', sportType]
      );

      if (existing.rows.length === 0 || distanceMeters > parseFloat(existing.rows[0].distance_meters)) {
        const oldDistance = existing.rows.length > 0 ? parseFloat(existing.rows[0].distance_meters) : null;
        await pool.query(
          `INSERT INTO personal_records (user_id, record_type, distance_meters, duration_seconds, pace_seconds_per_km, activity_id, sport_type, achieved_at, previous_record_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id, record_type, sport_type)
           DO UPDATE SET distance_meters = $3, duration_seconds = $4, pace_seconds_per_km = $5, activity_id = $6, achieved_at = $8, previous_record_seconds = personal_records.duration_seconds`,
          [userId, 'longest_run', distanceMeters, durationSeconds, paceSecondsPerKm, activityId, sportType, startTime, oldDistance]
        );
        newPRs.push({ record_type: 'longest_run', new_time: durationSeconds, old_time: oldDistance ? Math.round(oldDistance) : null, is_new: existing.rows.length === 0 });
      }
      continue;
    }

    if (pr.record_type === 'fastest_pace') {
      // Fastest pace — compare pace (lower is better), minimum distance threshold
      if (distanceMeters < pr.threshold) continue;

      const existing = await pool.query(
        'SELECT * FROM personal_records WHERE user_id = $1 AND record_type = $2 AND sport_type = $3',
        [userId, 'fastest_pace', sportType]
      );

      if (existing.rows.length === 0 || paceSecondsPerKm < parseFloat(existing.rows[0].pace_seconds_per_km)) {
        const oldPace = existing.rows.length > 0 ? parseFloat(existing.rows[0].pace_seconds_per_km) : null;
        await pool.query(
          `INSERT INTO personal_records (user_id, record_type, distance_meters, duration_seconds, pace_seconds_per_km, activity_id, sport_type, achieved_at, previous_record_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id, record_type, sport_type)
           DO UPDATE SET distance_meters = $3, duration_seconds = $4, pace_seconds_per_km = $5, activity_id = $6, achieved_at = $8, previous_record_seconds = personal_records.duration_seconds`,
          [userId, 'fastest_pace', distanceMeters, durationSeconds, paceSecondsPerKm, activityId, sportType, startTime, oldPace ? Math.round(oldPace) : null]
        );
        newPRs.push({ record_type: 'fastest_pace', new_time: Math.round(paceSecondsPerKm), old_time: oldPace ? Math.round(oldPace) : null, is_new: existing.rows.length === 0 });
      }
      continue;
    }

    // Standard distance PRs: check if activity covered at least this distance
    if (distanceMeters < pr.threshold) continue;

    // Estimate time for this standard distance using the activity's pace
    const estimatedTime = Math.round((pr.distance_meters / distanceMeters) * durationSeconds);

    const existing = await pool.query(
      'SELECT * FROM personal_records WHERE user_id = $1 AND record_type = $2 AND sport_type = $3',
      [userId, pr.record_type, sportType]
    );

    if (existing.rows.length === 0 || estimatedTime < existing.rows[0].duration_seconds) {
      const oldTime = existing.rows.length > 0 ? existing.rows[0].duration_seconds : null;
      await pool.query(
        `INSERT INTO personal_records (user_id, record_type, distance_meters, duration_seconds, pace_seconds_per_km, activity_id, sport_type, achieved_at, previous_record_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id, record_type, sport_type)
         DO UPDATE SET distance_meters = $3, duration_seconds = $4, pace_seconds_per_km = $5, activity_id = $6, achieved_at = $8, previous_record_seconds = personal_records.duration_seconds`,
        [userId, pr.record_type, pr.distance_meters, estimatedTime, (estimatedTime / pr.distance_meters) * 1000, activityId, sportType, startTime, oldTime]
      );
      newPRs.push({ record_type: pr.record_type, new_time: estimatedTime, old_time: oldTime, is_new: existing.rows.length === 0 });
    }
  }

  return newPRs;
}

// --- Achievement Check and Award ---

async function checkAndAwardAchievements(
  userId: number,
  activityId?: number
): Promise<Array<{ achievement_type: string; achievement_name: string; is_new: boolean }>> {
  const awarded: Array<{ achievement_type: string; achievement_name: string; is_new: boolean }> = [];

  for (const def of ACHIEVEMENT_DEFS) {
    // Check if already earned
    const existing = await pool.query(
      'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_type = $2',
      [userId, def.type]
    );
    if (existing.rows.length > 0) continue;

    const earned = await def.check({ userId, activityId });
    if (!earned) continue;

    const metadata = def.metadata ? await def.metadata({ userId, activityId }) : {};
    await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, metadata, activity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, achievement_type) DO NOTHING`,
      [userId, def.type, def.name, def.description, JSON.stringify(metadata), activityId || null]
    );
    awarded.push({ achievement_type: def.type, achievement_name: def.name, is_new: true });
  }

  return awarded;
}

// --- Routes ---

// GET /api/users/:id/achievements - Get user's achievements
router.get('/:id/achievements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT achievement_type, achievement_name, achievement_description, metadata, achieved_at, activity_id
       FROM user_achievements WHERE user_id = $1 ORDER BY achieved_at DESC`,
      [id]
    );

    // Also return unearned achievements for progress display
    const earned = new Set(result.rows.map((r: { achievement_type: string }) => r.achievement_type));
    const all = ACHIEVEMENT_DEFS.map(d => ({
      achievement_type: d.type,
      achievement_name: d.name,
      achievement_description: d.description,
      earned: earned.has(d.type),
    }));

    res.json({
      earned: result.rows,
      all: all,
      total_earned: result.rows.length,
      total_available: ACHIEVEMENT_DEFS.length,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// GET /api/users/:id/personal-records - Get user's PRs
router.get('/:id/personal-records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sport_type } = req.query;

    let query = 'SELECT * FROM personal_records WHERE user_id = $1';
    const values: unknown[] = [id];

    if (sport_type) {
      query += ' AND sport_type = $2';
      values.push(sport_type);
    }

    query += ' ORDER BY record_type';

    const result = await pool.query(query, values);

    res.json({ personal_records: result.rows });
  } catch (error) {
    console.error('Error fetching personal records:', error);
    res.status(500).json({ error: 'Failed to fetch personal records' });
  }
});

// GET /api/users/:id/streaks - Get user's streak data
router.get('/:id/streaks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10);

    const [currentStreak, longestStreak] = await Promise.all([
      calculateCurrentStreak(userId),
      calculateLongestStreak(userId),
    ]);

    // Total active days
    const totalDaysResult = await pool.query(
      'SELECT COUNT(DISTINCT DATE(start_time))::int AS total_days FROM activities WHERE user_id = $1',
      [userId]
    );

    // Total activities
    const totalActivitiesResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM activities WHERE user_id = $1',
      [userId]
    );

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_active_days: totalDaysResult.rows[0].total_days,
      total_activities: totalActivitiesResult.rows[0].total,
    });
  } catch (error) {
    console.error('Error calculating streaks:', error);
    res.status(500).json({ error: 'Failed to calculate streaks' });
  }
});

// GET /api/users/:id/summary - Get activity summary for a period
router.get('/:id/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    const period = (req.query.period as string) || 'week';

    let intervalSql: string;
    let previousIntervalSql: string;

    switch (period) {
      case 'week':
        intervalSql = "start_time >= NOW() - INTERVAL '7 days'";
        previousIntervalSql = "start_time >= NOW() - INTERVAL '14 days' AND start_time < NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        intervalSql = "start_time >= NOW() - INTERVAL '30 days'";
        previousIntervalSql = "start_time >= NOW() - INTERVAL '60 days' AND start_time < NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        intervalSql = "start_time >= NOW() - INTERVAL '365 days'";
        previousIntervalSql = "start_time >= NOW() - INTERVAL '730 days' AND start_time < NOW() - INTERVAL '365 days'";
        break;
      default:
        res.status(400).json({ error: 'Invalid period. Must be week, month, or year' });
        return;
    }

    // Current period stats
    const currentResult = await pool.query(
      `SELECT
        COUNT(*)::int AS activity_count,
        COALESCE(SUM(duration_seconds), 0)::int AS total_duration_seconds,
        COALESCE(SUM(distance_meters), 0)::numeric AS total_distance_meters,
        COUNT(DISTINCT DATE(start_time))::int AS active_days,
        COUNT(DISTINCT sport_type)::int AS sport_types_count
       FROM activities WHERE user_id = $1 AND ${intervalSql}`,
      [userId]
    );

    // Previous period stats (for comparison)
    const previousResult = await pool.query(
      `SELECT
        COUNT(*)::int AS activity_count,
        COALESCE(SUM(duration_seconds), 0)::int AS total_duration_seconds,
        COALESCE(SUM(distance_meters), 0)::numeric AS total_distance_meters,
        COUNT(DISTINCT DATE(start_time))::int AS active_days
       FROM activities WHERE user_id = $1 AND ${previousIntervalSql}`,
      [userId]
    );

    // Breakdown by sport type
    const sportBreakdown = await pool.query(
      `SELECT sport_type,
        COUNT(*)::int AS count,
        COALESCE(SUM(duration_seconds), 0)::int AS duration_seconds,
        COALESCE(SUM(distance_meters), 0)::numeric AS distance_meters
       FROM activities WHERE user_id = $1 AND ${intervalSql}
       GROUP BY sport_type ORDER BY count DESC`,
      [userId]
    );

    const current = currentResult.rows[0];
    const previous = previousResult.rows[0];

    res.json({
      period,
      current: {
        activity_count: current.activity_count,
        total_duration_seconds: current.total_duration_seconds,
        total_distance_meters: parseFloat(current.total_distance_meters),
        active_days: current.active_days,
        sport_types_count: current.sport_types_count,
      },
      previous: {
        activity_count: previous.activity_count,
        total_duration_seconds: previous.total_duration_seconds,
        total_distance_meters: parseFloat(previous.total_distance_meters),
        active_days: previous.active_days,
      },
      comparison: {
        activity_count_delta: current.activity_count - previous.activity_count,
        duration_delta: current.total_duration_seconds - previous.total_duration_seconds,
        distance_delta: parseFloat(current.total_distance_meters) - parseFloat(previous.total_distance_meters),
      },
      sport_breakdown: sportBreakdown.rows.map((r: { sport_type: string; count: number; duration_seconds: number; distance_meters: string }) => ({
        sport_type: r.sport_type,
        count: r.count,
        duration_seconds: r.duration_seconds,
        distance_meters: parseFloat(r.distance_meters),
      })),
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// POST /api/users/:id/check-achievements - Check and award new achievements (called after activity save)
router.post('/:id/check-achievements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    const requestingUserId = req.user!.userId;

    if (userId !== requestingUserId) {
      res.status(403).json({ error: 'You can only check achievements for yourself' });
      return;
    }

    const { activity_id, sport_type, distance_meters, duration_seconds, start_time } = req.body;

    // Check and award achievements
    const newAchievements = await checkAndAwardAchievements(userId, activity_id);

    // Detect PRs if activity data provided
    let newPRs: Array<{ record_type: string; new_time: number; old_time: number | null; is_new: boolean }> = [];
    if (activity_id && sport_type && distance_meters && duration_seconds) {
      newPRs = await detectAndSavePRs(userId, activity_id, sport_type, distance_meters, duration_seconds, start_time || new Date().toISOString());
    }

    res.json({
      new_achievements: newAchievements,
      new_personal_records: newPRs,
      achievements_count: newAchievements.length,
      prs_count: newPRs.length,
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Export for testing
export { calculateCurrentStreak, calculateLongestStreak, detectAndSavePRs, checkAndAwardAchievements, ACHIEVEMENT_DEFS };
export default router;
