-- Create follows table for social graph
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure a user can't follow the same person twice
  UNIQUE(follower_id, following_id),

  -- Ensure a user can't follow themselves
  CHECK(follower_id != following_id)
);

-- Index for fast follower lookups (who follows user X?)
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Index for fast following lookups (who does user X follow?)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);

-- Composite index for checking if user A follows user B
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows(follower_id, following_id);
