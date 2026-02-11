-- Create activities table for tracking workouts and activities
CREATE TYPE activity_visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE sport_type AS ENUM ('running', 'walking', 'biking', 'weightlifting', 'swimming', 'yoga', 'hit');

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_type sport_type NOT NULL,
  title VARCHAR(255),
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER, -- Total duration in seconds
  distance_meters NUMERIC(10, 2), -- Distance in meters (for running, biking, swimming)
  visibility activity_visibility NOT NULL DEFAULT 'public',
  sport_data JSONB, -- Extensible JSON field for sport-specific data (e.g., sets/reps for weightlifting, laps for swimming, GPS route for running)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fetching user's activities
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- Index for filtering by sport type
CREATE INDEX IF NOT EXISTS idx_activities_sport_type ON activities(sport_type);

-- Index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_activities_visibility ON activities(visibility);

-- Index for sorting by start time (most recent first)
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time DESC);

-- Composite index for feed queries (sport + visibility + time)
CREATE INDEX IF NOT EXISTS idx_activities_feed ON activities(sport_type, visibility, start_time DESC);

-- Index for JSONB sport_data queries (if needed later for filtering by specific sport data)
CREATE INDEX IF NOT EXISTS idx_activities_sport_data ON activities USING GIN (sport_data);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
