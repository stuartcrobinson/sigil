-- Personal records table for tracking best performances
CREATE TABLE IF NOT EXISTS personal_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,
  distance_meters NUMERIC(10, 2),
  duration_seconds INTEGER NOT NULL,
  pace_seconds_per_km NUMERIC(10, 2),
  activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
  sport_type VARCHAR(20) NOT NULL DEFAULT 'running',
  achieved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  previous_record_seconds INTEGER,
  CONSTRAINT unique_record_per_user UNIQUE (user_id, record_type, sport_type)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_type ON personal_records(record_type);
CREATE INDEX IF NOT EXISTS idx_personal_records_sport ON personal_records(sport_type);
