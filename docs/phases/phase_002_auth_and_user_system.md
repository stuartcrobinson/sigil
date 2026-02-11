# Phase 2: Auth and User System

## Objective
Implement user registration, login, and profile management.

## Tasks

### Backend Auth
- [x] Create User model (name, email, photo, bio, preferred_sports)
- [x] Implement POST /api/auth/register endpoint
- [x] Implement POST /api/auth/login endpoint
- [x] Implement GET /api/auth/me endpoint (current user)
- [x] Implement JWT token generation and validation middleware
- [x] Write tests for all auth endpoints
- [ ] Set up auth provider integration (OAuth) - deferred to post-MVP

### User Profile API
- [x] Implement GET /api/users/:id endpoint
- [x] Implement PUT /api/users/:id endpoint (update profile)
- [x] Write tests for profile endpoints
- [ ] Implement profile photo upload endpoint - deferred (use URL for now)
- [ ] Add privacy settings to user model - deferred to Phase 3 (social)

### Mobile Auth UI
- [x] Create login screen
- [x] Create registration screen
- [x] Create profile screen
- [x] Implement secure token storage
- [x] Create auth context and navigation flow
- [x] Write UI tests for auth flow (44 tests passing)
- [ ] Add OAuth login buttons - deferred to post-MVP

### Data Validation
- [x] Add request validation for all endpoints
- [x] Add error handling for auth failures
- [x] Test invalid inputs and edge cases
- [ ] Add rate limiting for login attempts - deferred to post-MVP

## Success Criteria
- Users can register and log in via email and OAuth
- Users can view and edit their profile
- All auth endpoints have passing tests
- Mobile app has working login/signup screens
- Tokens are securely stored and validated
