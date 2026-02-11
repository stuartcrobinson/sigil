-- Create activity_likes table for likes and high-fives on activities
CREATE TABLE IF NOT EXISTS activity_likes (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  like_type VARCHAR(20) NOT NULL DEFAULT 'like', -- 'like' or 'high_five'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_like_per_user UNIQUE (activity_id, user_id, like_type),
  CONSTRAINT valid_like_type CHECK (like_type IN ('like', 'high_five'))
);

-- Index for fetching likes on an activity
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON activity_likes(activity_id);

-- Index for fetching a user's likes
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON activity_likes(user_id);

-- Composite index for checking if a user has liked an activity
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_user ON activity_likes(activity_id, user_id);
