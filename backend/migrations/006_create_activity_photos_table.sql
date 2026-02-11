-- Create activity_photos table for photos taken during activities
CREATE TABLE IF NOT EXISTS activity_photos (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url VARCHAR(512) NOT NULL,
  caption TEXT,
  latitude NUMERIC(10, 7),  -- GPS latitude where photo was taken
  longitude NUMERIC(10, 7), -- GPS longitude where photo was taken
  route_position_meters NUMERIC(10, 2), -- distance from start of route where photo was taken
  taken_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fetching photos for an activity
CREATE INDEX IF NOT EXISTS idx_activity_photos_activity_id ON activity_photos(activity_id);

-- Index for ordering photos by route position
CREATE INDEX IF NOT EXISTS idx_activity_photos_route_position ON activity_photos(activity_id, route_position_meters ASC);

-- Index for fetching a user's photos
CREATE INDEX IF NOT EXISTS idx_activity_photos_user_id ON activity_photos(user_id);
