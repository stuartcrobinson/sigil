# Phase 4: Activity Tracking Core

## Objective
Build the shared activity tracking infrastructure that all sports will use.

## Tasks

### Activity Model
- [x] Create Activity model (user_id, sport_type, start_time, end_time, visibility, distance)
- [x] Create sport-specific data schema (JSONB field for extensibility)
- [x] Add database migrations (migration 003_create_activities_table.sql)
- [x] Write model tests (covered in API tests)

### Activity API
- [x] Implement POST /api/activities endpoint (create activity with validation)
- [x] Implement GET /api/activities/:id endpoint (with privacy enforcement)
- [x] Implement PUT /api/activities/:id endpoint (edit with ownership check)
- [x] Implement DELETE /api/activities/:id endpoint (with ownership check)
- [x] Implement GET /api/activities endpoint (list with filters)
- [x] Add pagination to activity list (limit/offset support)
- [x] Write tests for all activity endpoints (40 comprehensive tests)

### Activity Feed API
- [x] Implement feed via GET /api/activities endpoint (serves as global feed)
- [x] Add filter by sport type (sport_type query param)
- [x] Add filter by friends only vs public (visibility + privacy enforcement)
- [x] Add privacy enforcement (public/friends/private with follow check)
- [x] Optimize feed queries for performance (database indexes on sport_type, visibility, start_time)
- [x] Write tests for feed filtering (10 tests for list/feed behavior)

### Mobile Activity Infrastructure
- [x] Create shared Activity model/type (types/activity.ts with SportType, Visibility, Activity interfaces)
- [x] Create ActivityCard component (displays activity summary with sport icon, duration, distance, visibility)
- [x] Create ActivityList component (FlatList wrapper with loading/empty states, pull-to-refresh)
- [x] Create Activity service (activityService.ts with CRUD and list functions)
- [x] Write component tests (21 comprehensive tests for ActivityCard and ActivityList)
- [ ] Add activity detail screen (deferred - ActivityCard sufficient for MVP)
- [ ] Add create/edit activity screens (deferred to Phase 5 - sport-specific UIs)

## Test Status
- Backend API: 40 tests (all passing)
- Mobile components: 21 tests (all passing)
- Total Phase 4 tests: 61 tests

## Success Criteria
- [x] Activities can be created, read, updated, deleted (via API)
- [x] Feed shows activities with proper filtering (GET /api/activities with filters)
- [x] Privacy rules are enforced (public/friends/private with follower checks)
- [x] All endpoints have passing tests (40 backend tests)
- [x] Mobile has reusable activity components (ActivityCard, ActivityList with 21 tests)
