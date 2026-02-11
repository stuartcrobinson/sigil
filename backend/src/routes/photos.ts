import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// POST /api/activities/:id/photos - Add photo to activity
router.post('/:id/photos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));
    const { photo_url, caption, latitude, longitude, route_position_meters, taken_at } = req.body;

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    if (!photo_url) {
      res.status(400).json({ error: 'photo_url is required' });
      return;
    }

    // Check activity exists and user owns it
    const activity = await pool.query('SELECT id, user_id FROM activities WHERE id = $1', [activityId]);
    if (activity.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'You can only add photos to your own activities' });
      return;
    }

    // Validate coordinates if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      res.status(400).json({ error: 'Latitude must be between -90 and 90' });
      return;
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      res.status(400).json({ error: 'Longitude must be between -180 and 180' });
      return;
    }
    if (route_position_meters !== undefined && route_position_meters < 0) {
      res.status(400).json({ error: 'route_position_meters cannot be negative' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO activity_photos (activity_id, user_id, photo_url, caption, latitude, longitude, route_position_meters, taken_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [activityId, userId, photo_url, caption, latitude, longitude, route_position_meters, taken_at]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding photo:', error);
    res.status(500).json({ error: 'Failed to add photo' });
  }
});

// GET /api/activities/:id/photos - Get photos for activity
router.get('/:id/photos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    // Check activity exists and apply privacy
    const activity = await pool.query('SELECT id, user_id, visibility FROM activities WHERE id = $1', [activityId]);
    if (activity.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const act = activity.rows[0];
    if (act.visibility === 'private' && act.user_id !== userId) {
      res.status(403).json({ error: 'You do not have permission to view this activity' });
      return;
    }
    if (act.visibility === 'friends' && act.user_id !== userId) {
      const followCheck = await pool.query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [userId, act.user_id]
      );
      if (followCheck.rows.length === 0) {
        res.status(403).json({ error: 'You do not have permission to view this activity' });
        return;
      }
    }

    const result = await pool.query(
      `SELECT * FROM activity_photos
       WHERE activity_id = $1
       ORDER BY route_position_meters ASC NULLS LAST, created_at ASC`,
      [activityId]
    );

    res.json({ photos: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// DELETE /api/activities/:id/photos/:photoId - Delete photo
router.delete('/:id/photos/:photoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));
    const photoId = parseInt(paramStr(req.params.photoId));

    if (isNaN(activityId) || isNaN(photoId)) {
      res.status(400).json({ error: 'Invalid activity or photo ID' });
      return;
    }

    // Check photo exists and user owns it
    const photo = await pool.query(
      'SELECT id, user_id FROM activity_photos WHERE id = $1 AND activity_id = $2',
      [photoId, activityId]
    );

    if (photo.rows.length === 0) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    if (photo.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'You can only delete your own photos' });
      return;
    }

    await pool.query('DELETE FROM activity_photos WHERE id = $1', [photoId]);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
