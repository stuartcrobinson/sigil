import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { FollowWithUserInfo } from '../models/Follow';
import { User } from '../models/User';

const router = Router();

// POST /api/social/users/:id/follow
router.post(
  '/users/:id/follow',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = parseInt(idParam);

      if (isNaN(targetUserId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const followerId = req.user?.userId;
      if (!followerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Can't follow yourself
      if (followerId === targetUserId) {
        res.status(400).json({ error: 'You cannot follow yourself' });
        return;
      }

      // Check if target user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [
        targetUserId,
      ]);
      if (userCheck.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Try to create follow relationship
      try {
        await pool.query(
          'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
          [followerId, targetUserId]
        );
        res.status(201).json({ message: 'Successfully followed user' });
      } catch (error: any) {
        // Check if already following (unique constraint violation)
        if (error.code === '23505') {
          res.status(400).json({ error: 'You are already following this user' });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/social/users/:id/unfollow
router.delete(
  '/users/:id/unfollow',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = parseInt(idParam);

      if (isNaN(targetUserId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const followerId = req.user?.userId;
      if (!followerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Delete the follow relationship
      const result = await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, targetUserId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Follow relationship not found' });
        return;
      }

      res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/social/users/:id/followers
router.get(
  '/users/:id/followers',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = parseInt(idParam);

      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Get all users who follow this user
      const result = await pool.query<FollowWithUserInfo>(
        `SELECT
          f.id, f.follower_id, f.following_id, f.created_at,
          u.id as user_id, u.email, u.name, u.photo_url, u.bio, u.preferred_sports
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1
         ORDER BY f.created_at DESC`,
        [userId]
      );

      // Transform to simpler format for frontend
      const followers = result.rows.map((row) => ({
        id: row.user_id,
        email: row.email,
        name: row.name,
        photo_url: row.photo_url,
        bio: row.bio,
        preferred_sports: row.preferred_sports,
        followed_at: row.created_at,
      }));

      res.json({ followers, count: followers.length });
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/social/users/:id/following
router.get(
  '/users/:id/following',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = parseInt(idParam);

      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Get all users this user follows
      const result = await pool.query<FollowWithUserInfo>(
        `SELECT
          f.id, f.follower_id, f.following_id, f.created_at,
          u.id as user_id, u.email, u.name, u.photo_url, u.bio, u.preferred_sports
         FROM follows f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = $1
         ORDER BY f.created_at DESC`,
        [userId]
      );

      // Transform to simpler format for frontend
      const following = result.rows.map((row) => ({
        id: row.user_id,
        email: row.email,
        name: row.name,
        photo_url: row.photo_url,
        bio: row.bio,
        preferred_sports: row.preferred_sports,
        followed_at: row.created_at,
      }));

      res.json({ following, count: following.length });
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/social/search?q=query
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    // Search users by name or email (case-insensitive)
    const result = await pool.query<User>(
      `SELECT id, email, name, photo_url, bio, preferred_sports, created_at, updated_at
       FROM users
       WHERE LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)
       ORDER BY name
       LIMIT 50`,
      [`%${query}%`]
    );

    res.json({ users: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
