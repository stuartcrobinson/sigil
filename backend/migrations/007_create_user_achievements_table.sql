-- User achievements / badges table
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  metadata JSONB DEFAULT '{}',
  achieved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
  CONSTRAINT unique_achievement_per_user UNIQUE (user_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achieved_at ON user_achievements(achieved_at DESC);
