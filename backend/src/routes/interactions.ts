import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// --- LIKES / HIGH-FIVES ---

// POST /api/activities/:id/like - Like or high-five an activity
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));
    const { like_type = 'like' } = req.body;

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    const validTypes = ['like', 'high_five'];
    if (!validTypes.includes(like_type)) {
      res.status(400).json({ error: `Invalid like_type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    // Check activity exists
    const activity = await pool.query('SELECT id, user_id, visibility FROM activities WHERE id = $1', [activityId]);
    if (activity.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Privacy check: can only like visible activities
    const act = activity.rows[0];
    if (act.visibility === 'private' && act.user_id !== userId) {
      res.status(403).json({ error: 'You do not have permission to interact with this activity' });
      return;
    }
    if (act.visibility === 'friends' && act.user_id !== userId) {
      const followCheck = await pool.query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [userId, act.user_id]
      );
      if (followCheck.rows.length === 0) {
        res.status(403).json({ error: 'You do not have permission to interact with this activity' });
        return;
      }
    }

    try {
      const result = await pool.query(
        `INSERT INTO activity_likes (activity_id, user_id, like_type)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [activityId, userId, like_type]
      );
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(400).json({ error: `You have already ${like_type === 'high_five' ? 'high-fived' : 'liked'} this activity` });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error liking activity:', error);
    res.status(500).json({ error: 'Failed to like activity' });
  }
});

// DELETE /api/activities/:id/like - Unlike an activity
router.delete('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));
    const { like_type = 'like' } = req.body;

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM activity_likes WHERE activity_id = $1 AND user_id = $2 AND like_type = $3',
      [activityId, userId, like_type]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Like not found' });
      return;
    }

    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    console.error('Error unliking activity:', error);
    res.status(500).json({ error: 'Failed to unlike activity' });
  }
});

// GET /api/activities/:id/likes - Get likes for an activity
router.get('/:id/likes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    // Check activity exists and enforce privacy
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
      `SELECT al.id, al.like_type, al.created_at,
              u.id as user_id, u.name, u.photo_url
       FROM activity_likes al
       JOIN users u ON al.user_id = u.id
       WHERE al.activity_id = $1
       ORDER BY al.created_at DESC`,
      [activityId]
    );

    const likes = result.rows.map(row => ({
      id: row.id,
      like_type: row.like_type,
      created_at: row.created_at,
      user: { id: row.user_id, name: row.name, photo_url: row.photo_url },
    }));

    const likeCount = likes.filter(l => l.like_type === 'like').length;
    const highFiveCount = likes.filter(l => l.like_type === 'high_five').length;

    res.json({ likes, like_count: likeCount, high_five_count: highFiveCount, total: likes.length });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// --- COMMENTS ---

// POST /api/activities/:id/comments - Add comment to activity
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));
    const { text } = req.body;

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    // Check activity exists
    const activity = await pool.query('SELECT id, user_id, visibility FROM activities WHERE id = $1', [activityId]);
    if (activity.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Privacy check
    const act = activity.rows[0];
    if (act.visibility === 'private' && act.user_id !== userId) {
      res.status(403).json({ error: 'You do not have permission to comment on this activity' });
      return;
    }
    if (act.visibility === 'friends' && act.user_id !== userId) {
      const followCheck = await pool.query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [userId, act.user_id]
      );
      if (followCheck.rows.length === 0) {
        res.status(403).json({ error: 'You do not have permission to comment on this activity' });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO activity_comments (activity_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [activityId, userId, text.trim()]
    );

    // Fetch user info for the response
    const user = await pool.query('SELECT id, name, photo_url FROM users WHERE id = $1', [userId]);
    const comment = {
      ...result.rows[0],
      user: user.rows[0],
    };

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// GET /api/activities/:id/comments - Get comments for activity
router.get('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));

    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    // Check activity exists and enforce privacy
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
      `SELECT c.id, c.text, c.created_at, c.updated_at,
              u.id as user_id, u.name, u.photo_url
       FROM activity_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.activity_id = $1
       ORDER BY c.created_at ASC`,
      [activityId]
    );

    const comments = result.rows.map(row => ({
      id: row.id,
      text: row.text,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: { id: row.user_id, name: row.name, photo_url: row.photo_url },
    }));

    res.json({ comments, count: comments.length });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// DELETE /api/activities/:id/comments/:commentId - Delete own comment
router.delete('/:id/comments/:commentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const activityId = parseInt(paramStr(req.params.id));
    const commentId = parseInt(paramStr(req.params.commentId));

    if (isNaN(activityId) || isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid activity or comment ID' });
      return;
    }

    // Check comment exists and user owns it
    const comment = await pool.query(
      'SELECT id, user_id FROM activity_comments WHERE id = $1 AND activity_id = $2',
      [commentId, activityId]
    );

    if (comment.rows.length === 0) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'You can only delete your own comments' });
      return;
    }

    await pool.query('DELETE FROM activity_comments WHERE id = $1', [commentId]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
