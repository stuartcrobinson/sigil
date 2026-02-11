# Sigil Project Rules

Read GOALS.md at the start of every session — it is the north star.

## Project Docs
- docs/phases_master_checklist.md — phases + progress
- docs/phases/ — per-phase checklists
- docs/session_handoffs/ — work log (one per rt.sh iteration, auto-saved)
- docs/REVIEWED_TESTS.md — test audit tracker

## Stack
- **Mobile**: React Native — cross-platform (iOS/Android), TypeScript shared with backend, large ecosystem, good for single maintainer
- **Backend**: Node.js + Express + TypeScript — same language as mobile (shared types), fast iteration, excellent for REST APIs
- **Database**: PostgreSQL — structured data fits social/relational model (users, follows, activities), mature, free, self-hostable
- **Auth**: Custom JWT + bcrypt — full control, no vendor lock-in, simple for MVP, can add OAuth later
- **Repository**: Monorepo — shared TypeScript types between backend/mobile, single git repo easier for solo maintainer
- **Testing**: Jest — standard for both Node.js and React Native, same test runner everywhere

## Conventions
- Small functions, small files
- Tests live next to the code they test (e.g., foo.ts → foo.test.ts)
- Every API endpoint needs request validation and error handling
- Every UI component needs at least a render test
- Commit messages: imperative mood, describe what changed and why
- Always git push after committing

## Build & Test Commands
### Backend
- `cd backend && npm run dev` — start development server
- `cd backend && npm test` — run all tests
- `cd backend && npm run lint` — check code style

### Mobile
- `cd mobile && npm start` — start Metro bundler
- `cd mobile && npm run ios` — run iOS simulator
- `cd mobile && npm run android` — run Android emulator
- `cd mobile && npm test` — run all tests
- `cd mobile && npm run lint` — check code style

## Known Issues
- (none yet)
