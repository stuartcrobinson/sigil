# Sigil — Phases Master Checklist

## Phase 1: Bootstrap [COMPLETE]
- See docs/phases/phase_001_bootstrap.md
- [x] 1.1 Choose technology stack
- [x] 1.2 Initialize backend project
- [x] 1.3 Initialize mobile project
- [x] 1.4 Configure tooling (linting, testing)
- [x] 1.5 Write first tests (util, API, component)
- [x] 1.6 Database setup
- [x] 1.7 Documentation complete

**Status**: Complete! PostgreSQL installed and configured. Database migrations working with tracking system. Manual step remaining: remove mobile/.git directory for proper monorepo structure (React Native CLI creates nested git repo).

## Phase 2: Auth and User System [COMPLETE]
- See docs/phases/phase_002_auth_and_user_system.md
- [x] Backend auth endpoints (register, login, me)
- [x] User profile API (GET, PUT)
- [x] JWT token generation and validation
- [x] Mobile auth UI (login, register, profile screens)
- [x] Secure token storage in mobile app
- [x] Auth context and navigation flow
- [x] Comprehensive test coverage (54 tests: 10 backend + 44 mobile)

**Status**: Complete! Full auth flow implemented and tested. Backend has 10 tests, mobile has 44 tests. All authentication, registration, profile management features working. OAuth deferred to post-MVP. Database setup still requires manual PostgreSQL install.

## Phase 3: Social System [COMPLETE]
- See docs/phases/phase_003_social_system.md
- [x] Follow/unfollow API (POST/DELETE endpoints with 6 tests)
- [x] Followers/following lists API (GET endpoints with 6 tests)
- [x] User search API (GET endpoint with 7 tests)
- [x] Mobile social UI (SearchScreen, FollowersScreen, FollowingScreen with 22 tests)
- [x] Test isolation issues resolved
- [ ] Friend suggestions, follow buttons on profiles, privacy controls - deferred to Phase 4+
- **Status**: Complete! Backend: 61 tests (all passing). Mobile: 66 tests (all passing). Total: 127 tests. Test isolation fixed by using serial test execution and global teardown. Privacy controls deferred to Phase 4.

## Phase 4: Activity Tracking Core [COMPLETE]
- See docs/phases/phase_004_activity_tracking_core.md
- [x] Activity model and migration (activities table with JSONB sport_data)
- [x] Activity API (POST, GET, PUT, DELETE, LIST endpoints with 40 tests)
- [x] Feed API with filtering (sport type, visibility, privacy enforcement)
- [x] Mobile activity components (ActivityCard, ActivityList, activityService with 21 tests)
- [x] Behavior specifications (e2e_activity_tracking_behaviors.md)
- **Status**: Complete! Backend: 101 tests (61 API + 40 activity). Mobile: 87 tests (66 UI + 21 activity). Total: 188 tests. Activity CRUD working with privacy controls. Mobile components ready for integration. Detail/Create screens deferred to Phase 5 (sport-specific UIs).

## Phase 5: Sport Modules - Batch 1 [COMPLETE]
- See docs/phases/phase_005_sport_modules_batch_1.md
- [x] Backend utilities for running, weightlifting, yoga (114 tests added)
- [x] Weightlifting SetLogger component (< 5 taps requirement met)
- [x] Yoga timer and activity screen (14 tests fixed, now all passing)
- [x] All test timing/modal issues resolved
- [x] Full weightlifting workout screen with ExercisePicker (43 tests added)
- [x] **WEB DEPLOYMENT** - Expo migration + Cloudflare Pages (https://fd5469fc.sigil-59d.pages.dev)
- [x] **PRODUCTION E2E TESTING** - Playwright + MailSlurp integration (14 tests)
- [x] **DEPLOYMENT INFRASTRUCTURE** - AWS App Runner + RDS setup
- [x] **AWS DEPLOYMENT GUIDE** - Complete step-by-step documentation
- [x] **TEST COVERAGE VERIFICATION** - 100% coverage (395 tests passing)
- [x] Deploy backend to AWS — EC2 at 54.221.92.67:3000, RDS connected, 216 tests passed
- [x] Running GPS tracking — moved to Phase 6A (no longer deferred)
- [ ] Sport selector and navigation integration
- **Status**: READY FOR AWS DEPLOYMENT. Backend: 216 tests (all passing). Mobile: 179 tests (all passing). E2E: 14 tests. Web platform deployed to Cloudflare Pages. AWS deployment infrastructure complete (apprunner.yaml, scripts, guides). Test coverage: 100% of code files have tests. Health check endpoint ready. Environment configs complete. Full documentation created. Next: Deploy backend to AWS App Runner + RDS PostgreSQL. Running GPS tracking deferred to Phase 6.

## Phase 6: GPS Tracking + Route Photos + Social Interactions [IN PROGRESS]
- See docs/phases/phase_006_gps_social_photos.md
- **STRATEGIC SHIFT**: Focus on running/walking/biking Strava parity FIRST
- Swimming and HIT/sprints DEFERRED until core sports are polished

### 6A: GPS Tracking (Running/Walking/Biking)
- [x] Backend: GPS utility functions (haversine, pace, splits, elevation) — 35 tests
- [x] Backend: Running utility functions (route validation, distance, splits) — 38 tests
- [x] Mobile: locationService with mock GPS provider for e2e testing — 16 tests
- [x] Mobile: RunningActivityScreen with GPS tracking (start/pause/resume/stop/save) — 25 tests
- [x] Mobile: Live route recording during activity (lat/lng/timestamp/speed/accuracy)
- [x] Backend: store GPS route in sport_data JSONB — E2E tested (10 tests)
- [x] Mobile: LiveRouteMap component — real-time route display during active runs (react-native-maps) — 12 tests
  - Douglas-Peucker route simplification (on-device, 200+ point threshold)
  - Auto-center on current position during tracking
  - Start marker (green), current position marker (blue), polyline (orange)
  - Point count overlay, graceful web/test fallback
  - BDD spec: B-GPS-010
- [ ] Mobile: Route display on map after activity (post-save, route review)
- [ ] Mobile: Background location tracking (expo-location background task)
- [ ] Mobile: Geo-fenced auto start/stop — set START/STOP waypoints on map, auto-start when user reaches START, auto-stop when user reaches STOP (after moving 100+ ft from START). START and STOP can be same point (e.g., home). Solves "forgot to stop my run" problem
- [ ] Backend: Store waypoint configs (start_lat, start_lng, stop_lat, stop_lng, activation_radius_m) per user or per route preset

### 6B: In-Activity Photo Capture with GPS Pinning
- [x] Backend: activity_photos table + migration (photo_url, lat, lng, route_position_meters)
- [x] Backend: photo endpoints (POST, GET, DELETE) with GPS validation — 22 tests
- [x] Mobile: photoService (addPhoto, getPhotos, deletePhoto) — 12 tests
- [x] Mobile: Photo count indicator on ActivityCard — tested
- [x] Mobile: expo-image-picker installed for photo capture
- [x] Mobile: cameraService (takePhoto, pickFromGallery, requestPermissions) — 14 tests
- [x] Mobile: Camera button during active GPS tracking (RunningActivityScreen) — 4 tests
- [ ] Mobile: Route photo gallery — view photos placed on the route map (needs react-native-maps)

### 6C: Social Feed Interactions
- [x] Backend: activity_likes table + migration (like, high_five types)
- [x] Backend: activity_comments table + migration
- [x] Backend: likes endpoints (POST/DELETE/GET) with privacy enforcement — 37 tests
- [x] Backend: comments endpoints (POST/GET/DELETE) with privacy enforcement
- [x] Backend: high-five as like variant (like_type field)
- [x] Mobile: interactionService (like, unlike, getLikes, addComment, getComments, deleteComment) — 15 tests
- [x] Backend: include like_count, high_five_count, comment_count, photo_count in activity list responses
- [x] Backend: include user_name, user_photo_url in activity list responses
- [x] Mobile: like/high-five buttons on ActivityCard with optimistic UI — 18 tests
- [x] Mobile: comment count display on ActivityCard
- [x] Mobile: CommentSheet modal (view/add/delete comments) — 22 tests
- [x] Mobile: CommentSheet integrated into HomeScreen — 3 tests

### 6F: HomeScreen + Navigation
- [x] Mobile: HomeScreen with activity feed (FlatList, pull-to-refresh, empty state) — 14 tests
- [x] Mobile: Start Activity FAB button → navigates to RunningActivityScreen
- [x] Mobile: Bottom tab navigation (Home, Search, Profile) — @react-navigation/bottom-tabs
- [x] Mobile: App.tsx updated with tab navigator + RunningActivity stack screen

### 6D: BDD E2E Tests
- [x] BDD behavior specs document with 40+ behaviors defined (updated with B-SMOKE-001)
- [x] E2E API tests: social interactions (25 tests — likes, high-fives, comments, privacy)
- [x] E2E API tests: photo management (22 tests — add/view/delete with GPS, privacy)
- [x] E2E API tests: social features (17 tests — search, follow, unfollow, profile)
- [x] E2E API tests: feed enrichment (11 tests — social counts, user info, privacy)
- [x] E2E API tests: GPS activity creation (10 tests — route data, JSONB, privacy)
- [x] E2E smoke test: full user journey (12 tests — register→activity→like→comment→feed→cleanup→logout)
- [x] E2E navigation tests: API endpoint access + auth guards (13 tests)
- [x] All ~110 E2E API tests passing on local
- [x] Jest config fixed to exclude e2e/ from unit test runs
- [x] Playwright config split: API project (single browser) + UI project (multi-browser)
- [x] EC2 E2E runner scripts: `scripts/run-e2e-ec2.sh`, `scripts/run-tests-ec2.sh`
- [x] S3 output with LATEST pointers for CI integration
- [ ] UI-level E2E tests (after expo-location + react-native-maps integrated)

### 6E: Test Quality Audit
- [x] Backend test audit: all 317 tests are real integration tests — no false positives
- [x] Mobile test audit: all 281 tests are real behavior tests — no false positives
- [x] False positive fix session (2026-02-11): 8 backend + 10 mobile issues found and resolved
  - Fixed: vacuous `.every()` on empty arrays, loose tolerances, always-true functions
  - Fixed: `meetsQuickLoggingRequirement()` source code (was always returning true)
  - Fixed: YogaTimer tests converted from real-time to fake timers
  - Fixed: async assertion handling in HomeScreen tests
- [x] Test audit round 3 (2026-02-11): 12 additional issues found and resolved across 10 files
  - Fixed: `social.test.ts` vacuous `not.toHaveProperty` on potentially undefined element
  - Fixed: `activities.test.ts` conditional ordering skip that could vacuously pass
  - Fixed: `runningUtils.ts` **SOURCE BUG** — pace validation used truthy check instead of undefined check
  - Fixed: `activities.spec.ts` `.catch()` swallowing assertion failures + conditional ordering skip
  - Fixed: `auth.spec.ts` + `activities.spec.ts` `isDisabled` trivially-true branches (added URL verification)
  - Fixed: `smoke.spec.ts` logout accepting 404 as success
  - Strengthened: `runningUtils.test.ts` weak `.toBeDefined()` assertions → regex format checks
  - Strengthened: `HomeScreen.test.tsx` existence-only social count → value verification
  - Strengthened: `RunningActivityScreen.test.tsx` summary stats existence → content verification
  - Strengthened: `photoService.test.ts` loose `stringContaining` → exact field checks via JSON.parse
  - Added: 3 new tests for pace validation edge cases (numeric 0, boolean false, empty route)
- [x] Competitive research completed (Strava, NRC, Garmin, AllTrails, Peloton, MapMyRun)
- [x] Key insight: "Everything Strava charges $80/year for is free on Sigil. Forever."

### 6G: Seed Data & Test Users
- [x] `backend/scripts/seed.ts` — 7 test users, 12 activities, 8 follows, 14 likes, 10 comments
- [x] GPS route generation (Central Park routes with lat/lng/elevation/timestamp)
- [x] `npm run seed` command in package.json
- [x] Idempotent: safe to rerun (cleans existing seed data first)
- [x] Test credentials: `test@sigil.app`, `alice@sigil.app`, `bob@sigil.app`, `carol@sigil.app` (all `TestPass123!`)
- [x] Additional test users: `m@m.m` / `mmmmmmm&`, `n@n.n` / `nnnnnnn&`, `q@q.q` / `qqqqqqq&`

### 6H: Sync & CI/CD Pipeline
- [x] `scripts/sync-sigil.sh` — sync dev repo to public repo (excludes secrets, agent logs, handoffs)
- [x] `scripts/sync-and-deploy.sh` — full workflow: sync → test → commit → push (staging or prod)
- [x] `.github/workflows/staging.yml` — push to `staging` branch → test → deploy to staging EC2
- [x] `.github/workflows/production.yml` — push to `main` branch → test → deploy to production EC2
- [x] Auto-seed on staging deploy (test data available for phone testing)
- [x] Public repo README.md with quickstart, test users, architecture overview
- [x] Create public GitHub repo `stuartcrobinson/sigil` — https://github.com/stuartcrobinson/sigil
- [x] Initial sync + push to GitHub — 319 backend tests pass in CI
- [x] CI pipeline green (run #21923806408) — deploy skips gracefully without EC2 secrets
- [x] Replace MailSlurp with mailpail for e2e email testing (AWS SES + S3)
- [x] Test coverage audit: tightened tolerances, added DB-level assertions, closed edge case gaps
- [x] Test audit round 4 (2026-02-11): privacy bypass fixes + LiveRouteMap
  - Fixed: CRITICAL privacy bypass in `GET /api/activities?user_id=X` — was skipping privacy rules
  - Fixed: CRITICAL missing privacy checks for `GET /api/activities/:id/likes` and `GET /api/activities/:id/comments`
  - Fixed: E2E GPS float equality (toBe→toBeCloseTo) in gps-activity.spec.ts
  - Fixed: E2E photos ordering vacuous-pass guard in photos.spec.ts
  - Added: 9 new privacy regression tests (2 activities + 7 interactions)
  - Added: 12 new LiveRouteMap component tests
- [ ] Configure GitHub Secrets: `STAGING_EC2_HOST`, `PROD_EC2_HOST`, `EC2_SSH_KEY`, `STAGING_DATABASE_URL`, `PROD_DATABASE_URL`
- [ ] Set up mailpail SES infrastructure: `npx mailpail setup --domain test.sigil.app --bucket sigil-test-emails`
- [ ] Set up staging EC2 instance (or reuse existing with separate pm2 process)

**Current Test Totals**: Backend 367 + Mobile 400 + E2E API 85 = **852 tests** (all passing)

**Phase 6 Status**: RunningActivityScreen with GPS tracking + camera + LiveRouteMap + audio pace announcements + post-run celebration with PRs/achievements. Full stats system (achievements, PRs, streaks, summaries). OnboardingScreen for first-time users. Web platform fully functional (GPS, camera, alerts). See Phase 6I/6J below.

**S3 Test Results**:
- Backend (EC2): `s3://sigil-test-outputs/backend-tests/20260211_175200_results.txt` — 331 tests PASSED
- E2E (EC2): `s3://sigil-test-outputs/e2e-tests/20260211_175201/` — 85 tests PASSED
- Run E2E: `./scripts/run-e2e-ec2.sh --pull`
- Run backend: `./scripts/run-tests-ec2.sh --pull`

### 6I: Delight Features (2026-02-12)
- [x] Backend: user_achievements table + migration (007)
- [x] Backend: personal_records table + migration (008)
- [x] Backend: 18 achievement definitions (first_activity, first_run, first_5k, 10k, half, marathon, 50K/100K/500K club, streak_7, streak_30, early_bird, night_owl, 5/10/50 activities, photo_first, social_butterfly)
- [x] Backend: PR detection for 1K, 5K, 10K, half marathon, marathon, longest run, fastest pace
- [x] Backend: Streak calculation (current + longest)
- [x] Backend: Summary endpoint (week/month/year with comparison + sport breakdown)
- [x] Backend: GET /api/users/:id/achievements
- [x] Backend: GET /api/users/:id/personal-records
- [x] Backend: GET /api/users/:id/streaks
- [x] Backend: GET /api/users/:id/summary?period=week|month|year
- [x] Backend: POST /api/users/:id/check-achievements (auto-detect PRs + badges)
- [x] Backend: 36 new tests (achievements, PRs, streaks, summaries)
- [x] Mobile: statsService (getAchievements, getPersonalRecords, getStreaks, getSummary, checkAchievements) — 10 tests
- [x] Mobile: speechService (audio pace announcements, TTS, configurable intervals) — 24 tests
- [x] Mobile: OnboardingScreen (3-slide intro, skip, complete) — 9 tests
- [x] Mobile: CelebrationScreen (post-run PRs + achievements display) — 13 tests
- [x] Mobile: RunningActivityScreen integration (audio toggle, celebration flow, achievement check after save)
- [x] Mobile: Updated RunningActivityScreen tests for celebration flow — 33 tests (maintained)
- [x] BDD behavior specs: B-ACHIEVE-001, B-PR-001, B-STREAK-001, B-SUMMARY-001, B-ONBOARD-001, B-AUDIO-001, B-CELEBRATE-001
- [x] README.md with phone testing instructions + pre-seeded user accounts
- [ ] **DF-7: Running clubs / group challenges** (HIGH PRIORITY — next)
- [ ] **DF-8: Route discovery** (popular routes near user)
- [ ] **DF-9: Guided audio runs** (Couch to 5K style coaching)
- [ ] **DF-10: Safety features / live sharing** (SOS button, live tracking)
- [ ] **DF-11: Data import from Strava/Garmin** (GPX/FIT import)
- [ ] **DF-12: Wearable integration** (Apple Watch / Wear OS)
- [x] Deploy delight features to production EC2
- [x] Run E2E tests against production URL
- [x] Upload test results to S3

**Test Delta (2026-02-12 delight session)**: Backend +36, Mobile +62, E2E +0 = **+98 tests**

### 6J: Web Platform Fixes (2026-02-12)
- [x] Cross-platform alert utility (`mobile/src/utils/platformAlert.ts`) — replaces Alert.alert on web with window.confirm/alert
- [x] Updated 6 screens to use showAlert: Login, Register, Profile, RunningActivity, YogaActivity, WeightliftingActivity
- [x] Browser GPS tracking (`mobile/src/services/locationService.web.ts`) — navigator.geolocation.watchPosition
- [x] Web camera service (`mobile/src/services/cameraService.web.ts`) — file input with capture="environment"
- [x] Strengthened weak tests: CelebrationScreen (+2 tests), interactions.spec.ts, social.spec.ts
- [x] BDD specs: B-WEB-001, B-WEB-002, B-WEB-003, B-WEB-004
- [x] Full CI/CD pipeline: unit tests -> staging -> E2E -> prod -> push (3m 25s)
- [x] Production live: https://sigil.fit + https://api.sigil.fit

**Test Delta (2026-02-12 web fixes session)**: Backend +0, Mobile +2, E2E +0 = **+2 tests**

## Phase 7: Sport Modules - Batch 2 [DEFERRED]
- See docs/phases/phase_007_sport_modules_batch_2.md
- Swimming, HIT/sprints modules — deferred until running/biking/walking reach Strava parity
- Sport module polish and sport selector navigation

## Phase 8+: Post-MVP Features [NOT YET PLANNED]
- Training plans, progress charts, challenges, donations, imports from other platforms
- Will be planned after MVP phases complete
