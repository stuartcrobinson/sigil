import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Type definitions
type SportType = 'running' | 'walking' | 'biking' | 'weightlifting' | 'swimming' | 'yoga' | 'hit';
type Visibility = 'public' | 'friends' | 'private';

interface Activity {
  id: number;
  user_id: number;
  sport_type: SportType;
  title?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  distance_meters?: number;
  visibility: Visibility;
  sport_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CreateActivityBody {
  sport_type: SportType;
  title?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  distance_meters?: number;
  visibility?: Visibility;
  sport_data?: Record<string, unknown>;
}

// POST /api/activities - Create a new activity
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      sport_type,
      title,
      description,
      start_time,
      end_time,
      duration_seconds,
      distance_meters,
      visibility = 'public',
      sport_data,
    }: CreateActivityBody = req.body;

    // Validation
    if (!sport_type || !start_time) {
      res.status(400).json({ error: 'sport_type and start_time are required' });
      return;
    }

    const validSportTypes: SportType[] = ['running', 'walking', 'biking', 'weightlifting', 'swimming', 'yoga', 'hit'];
    if (!validSportTypes.includes(sport_type)) {
      res.status(400).json({ error: `Invalid sport_type. Must be one of: ${validSportTypes.join(', ')}` });
      return;
    }

    const validVisibilities: Visibility[] = ['public', 'friends', 'private'];
    if (!validVisibilities.includes(visibility)) {
      res.status(400).json({ error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` });
      return;
    }

    if (duration_seconds !== undefined && duration_seconds < 0) {
      res.status(400).json({ error: 'duration_seconds cannot be negative' });
      return;
    }

    if (distance_meters !== undefined && distance_meters < 0) {
      res.status(400).json({ error: 'distance_meters cannot be negative' });
      return;
    }

    // Insert activity
    const result = await pool.query<Activity>(
      `INSERT INTO activities
        (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data ? JSON.stringify(sport_data) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// GET /api/activities/:id - Get a single activity by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await pool.query<Activity>(
      'SELECT * FROM activities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const activity = result.rows[0];

    // Privacy check: only show activity if:
    // 1. User owns it
    // 2. It's public
    // 3. It's friends-only and user follows the owner
    if (activity.user_id !== userId) {
      if (activity.visibility === 'private') {
        res.status(403).json({ error: 'You do not have permission to view this activity' });
        return;
      }

      if (activity.visibility === 'friends') {
        // Check if user follows the activity owner
        const followCheck = await pool.query(
          'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
          [userId, activity.user_id]
        );

        if (followCheck.rows.length === 0) {
          res.status(403).json({ error: 'You do not have permission to view this activity' });
          return;
        }
      }
    }

    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// PUT /api/activities/:id - Update an activity
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      sport_type,
      title,
      description,
      start_time,
      end_time,
      duration_seconds,
      distance_meters,
      visibility,
      sport_data,
    }: Partial<CreateActivityBody> = req.body;

    // Check if activity exists and user owns it
    const existingActivity = await pool.query<Activity>(
      'SELECT * FROM activities WHERE id = $1',
      [id]
    );

    if (existingActivity.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (existingActivity.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'You do not have permission to update this activity' });
      return;
    }

    // Validation
    if (sport_type) {
      const validSportTypes: SportType[] = ['running', 'walking', 'biking', 'weightlifting', 'swimming', 'yoga', 'hit'];
      if (!validSportTypes.includes(sport_type)) {
        res.status(400).json({ error: `Invalid sport_type. Must be one of: ${validSportTypes.join(', ')}` });
        return;
      }
    }

    if (visibility) {
      const validVisibilities: Visibility[] = ['public', 'friends', 'private'];
      if (!validVisibilities.includes(visibility)) {
        res.status(400).json({ error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` });
        return;
      }
    }

    if (duration_seconds !== undefined && duration_seconds < 0) {
      res.status(400).json({ error: 'duration_seconds cannot be negative' });
      return;
    }

    if (distance_meters !== undefined && distance_meters < 0) {
      res.status(400).json({ error: 'distance_meters cannot be negative' });
      return;
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (sport_type !== undefined) {
      updates.push(`sport_type = $${paramCount++}`);
      values.push(sport_type);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(end_time);
    }
    if (duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramCount++}`);
      values.push(duration_seconds);
    }
    if (distance_meters !== undefined) {
      updates.push(`distance_meters = $${paramCount++}`);
      values.push(distance_meters);
    }
    if (visibility !== undefined) {
      updates.push(`visibility = $${paramCount++}`);
      values.push(visibility);
    }
    if (sport_data !== undefined) {
      updates.push(`sport_data = $${paramCount++}`);
      values.push(sport_data ? JSON.stringify(sport_data) : null);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);
    const result = await pool.query<Activity>(
      `UPDATE activities SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// DELETE /api/activities/:id - Delete an activity
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if activity exists and user owns it
    const existingActivity = await pool.query<Activity>(
      'SELECT * FROM activities WHERE id = $1',
      [id]
    );

    if (existingActivity.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (existingActivity.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'You do not have permission to delete this activity' });
      return;
    }

    await pool.query('DELETE FROM activities WHERE id = $1', [id]);

    res.status(200).json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// GET /api/activities - List activities with filters and pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      user_id,
      sport_type,
      visibility,
      limit = '20',
      offset = '0'
    } = req.query;

    // Build query dynamically based on filters
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Filter by user_id if provided
    if (user_id) {
      conditions.push(`a.user_id = $${paramCount++}`);
      values.push(user_id);
    }

    // Filter by sport_type if provided
    if (sport_type) {
      conditions.push(`a.sport_type = $${paramCount++}`);
      values.push(sport_type);
    }

    // Filter by visibility if provided
    if (visibility) {
      conditions.push(`a.visibility = $${paramCount++}`);
      values.push(visibility);
    }

    // If no user_id filter, apply privacy rules:
    // Show only activities that are:
    // 1. Public, OR
    // 2. User's own activities, OR
    // 3. Friends-only from users they follow
    if (!user_id) {
      conditions.push(`(
        a.visibility = 'public'
        OR a.user_id = $${paramCount}
        OR (a.visibility = 'friends' AND a.user_id IN (
          SELECT following_id FROM follows WHERE follower_id = $${paramCount}
        ))
      )`);
      values.push(userId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Add pagination
    values.push(limit, offset);
    const query = `
      SELECT a.*,
        u.name AS user_name,
        u.photo_url AS user_photo_url,
        COALESCE((SELECT COUNT(*)::int FROM activity_likes WHERE activity_id = a.id AND like_type = 'like'), 0) AS like_count,
        COALESCE((SELECT COUNT(*)::int FROM activity_likes WHERE activity_id = a.id AND like_type = 'high_five'), 0) AS high_five_count,
        COALESCE((SELECT COUNT(*)::int FROM activity_comments WHERE activity_id = a.id), 0) AS comment_count,
        COALESCE((SELECT COUNT(*)::int FROM activity_photos WHERE activity_id = a.id), 0) AS photo_count
      FROM activities a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.start_time DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    const result = await pool.query(query, values);

    res.json({
      activities: result.rows,
      pagination: {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        total: result.rows.length,
      }
    });
  } catch (error) {
    console.error('Error listing activities:', error);
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

export default router;
