# Phase 6: GPS Tracking + Route Photos + Social Interactions

## Strategic Context
**Priority shift**: Running/Walking/Biking must reach Strava parity BEFORE expanding to other sports.
Swimming and HIT/sprints are DEFERRED to Phase 7.

## 6A: GPS Tracking (Running/Walking/Biking)

### Backend
- [ ] GPS route data stored in `sport_data` JSONB field as `route_points` array
- [ ] Each point: `{ lat, lng, timestamp, elevation?, speed?, accuracy? }`
- [ ] Pace calculation endpoint or include in activity response
- [ ] Splits calculation (per-km or per-mile pace)

### Mobile
- [ ] Install and configure `expo-location`
- [ ] `LocationService` with start/stop tracking, mock support for testing
- [ ] Background location tracking (foreground service notification)
- [ ] Live route recording during activity
- [ ] Distance calculation from GPS points (Haversine formula)
- [ ] Pace display during run (current pace + average pace)
- [ ] `RunningActivityScreen` with live GPS, map, pace, distance, duration
- [ ] Route display on map after completion

### Testing
- [ ] `LocationService` unit tests with mocked GPS data
- [ ] GPS route recording integration tests
- [ ] Pace/distance calculation unit tests
- [ ] Mock location provider for e2e tests (no physical device needed)

---

## 6B: In-Activity Photo Capture with GPS Pinning

### Backend
- [ ] Migration 004: `activity_photos` table
  - `id` SERIAL PRIMARY KEY
  - `activity_id` INTEGER REFERENCES activities(id) ON DELETE CASCADE
  - `user_id` INTEGER REFERENCES users(id) ON DELETE CASCADE
  - `photo_url` VARCHAR(512) NOT NULL
  - `caption` TEXT
  - `latitude` NUMERIC(10, 7)
  - `longitude` NUMERIC(10, 7)
  - `route_position_meters` NUMERIC(10, 2) — distance from start where photo was taken
  - `taken_at` TIMESTAMP
  - `created_at` TIMESTAMP DEFAULT NOW()
- [ ] POST /api/activities/:id/photos — upload photo metadata
- [ ] GET /api/activities/:id/photos — list photos for activity
- [ ] DELETE /api/activities/:id/photos/:photoId — remove photo
- [ ] Privacy: photos inherit activity visibility
- [ ] Tests for all photo endpoints

### Mobile
- [ ] Camera capture during active run/walk/ride
- [ ] Record current GPS coordinates at capture time
- [ ] Record distance along route at capture time
- [ ] Photo preview with GPS marker
- [ ] Route photo gallery view — photos shown as pins on the route map
- [ ] Quick-capture UI (minimal interruption to the run)

### Testing
- [ ] Photo capture mock tests
- [ ] GPS coordinate recording at capture time tests
- [ ] Photo gallery rendering tests
- [ ] Backend photo endpoint tests

---

## 6C: Social Feed Interactions

### Backend
- [ ] Migration 005: `activity_likes` table
  - `id` SERIAL PRIMARY KEY
  - `activity_id` INTEGER REFERENCES activities(id) ON DELETE CASCADE
  - `user_id` INTEGER REFERENCES users(id) ON DELETE CASCADE
  - `like_type` VARCHAR(20) DEFAULT 'like' — 'like' or 'high_five'
  - `created_at` TIMESTAMP DEFAULT NOW()
  - UNIQUE(activity_id, user_id, like_type)
- [ ] Migration 006: `activity_comments` table
  - `id` SERIAL PRIMARY KEY
  - `activity_id` INTEGER REFERENCES activities(id) ON DELETE CASCADE
  - `user_id` INTEGER REFERENCES users(id) ON DELETE CASCADE
  - `text` TEXT NOT NULL
  - `created_at` TIMESTAMP DEFAULT NOW()
  - `updated_at` TIMESTAMP DEFAULT NOW()
- [ ] POST /api/activities/:id/like — like or high-five
- [ ] DELETE /api/activities/:id/like — unlike
- [ ] GET /api/activities/:id/likes — list likes with user info
- [ ] POST /api/activities/:id/comments — add comment
- [ ] GET /api/activities/:id/comments — list comments
- [ ] DELETE /api/activities/:id/comments/:commentId — remove own comment
- [ ] Update GET /api/activities and GET /api/activities/:id to include counts
- [ ] Tests for all interaction endpoints

### Mobile
- [ ] Like/high-five button on ActivityCard
- [ ] Comment button → comment sheet/modal
- [ ] Show like_count, comment_count on cards
- [ ] Comment list with user names and timestamps
- [ ] Optimistic UI for likes (instant feedback)
- [ ] Tests for all interaction UI components

---

## 6D: BDD E2E Tests
- [ ] Write BDD specs for GPS tracking behaviors
- [ ] Write BDD specs for photo capture behaviors
- [ ] Write BDD specs for social interaction behaviors
- [ ] Implement e2e tests for all new behaviors
- [ ] Run on AWS EC2, upload results to S3
- [ ] Update test coverage report

## Success Criteria
- GPS tracking works for running/walking/biking with accurate distance and pace
- Photos can be taken mid-activity with GPS coordinates recorded
- Photos display on the route map in the activity detail view
- Like, comment, and high-five work on all activities
- All features have comprehensive backend + mobile tests
- All e2e tests pass on AWS EC2
- GPS tracking testable without physical device (mock location support)
