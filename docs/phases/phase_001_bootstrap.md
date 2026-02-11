# Phase 1: Bootstrap

## Objective
Make architecture decisions and create working project scaffolding with a passing test.

## Tasks

### 1.1 Choose Technology Stack
- [x] Decide mobile framework: React Native (recommended for cross-platform, web reuse), Flutter, or native
- [x] Decide backend: Node.js/Express/TypeScript (recommended - same lang as mobile), Python/FastAPI, or Go
- [x] Decide database: PostgreSQL (recommended - structured data, good for social/relational), MongoDB, or Supabase
- [x] Decide auth strategy: Supabase Auth (all-in-one), Firebase Auth, Auth0, or custom JWT
- [x] Decide monorepo vs multi-repo: Monorepo recommended (shared types, easier dev)
- [x] Document all choices in CLAUDE.md with 1-2 sentence rationale per choice

### 1.2 Initialize Backend Project
- [x] Create `backend/` directory
- [x] Initialize Node.js project: `npm init -y` and install TypeScript, Express
- [x] Create `backend/src/` directory structure: `routes/`, `models/`, `middleware/`, `utils/`
- [x] Set up `tsconfig.json` with strict mode
- [x] Create `backend/src/index.ts` with basic Express server that returns "Hello Sigil" on GET /
- [x] Add start script to `package.json`
- [x] Verify server runs: `npm start` should serve on localhost

### 1.3 Initialize Mobile Project
- [x] Create `mobile/` directory
- [x] Run React Native CLI init (or Expo init if chosen)
- [x] Clean out demo code, create minimal `App.tsx` that shows "Sigil" text
- [x] Create `mobile/src/` directory for app code
- [ ] Verify app runs on iOS and Android simulator

### 1.4 Configure Tooling
- [x] Add ESLint config to backend and mobile (extends recommended TypeScript rules)
- [x] Add Prettier config (single quotes, 2 space indent, trailing commas)
- [x] Set up Jest for backend: install jest, ts-jest, @types/jest
- [x] Set up Jest for mobile: configure with React Native preset
- [x] Add lint and test scripts to both package.json files

### 1.5 Write First Tests
- [x] Backend: create `backend/src/utils/formatDuration.ts` helper and `formatDuration.test.ts` with 2-3 passing tests
- [x] Backend: create basic test for GET / endpoint (returns 200 + correct message)
- [x] Mobile: create `mobile/src/components/Text.tsx` component and `Text.test.tsx` with render test
- [x] Run all tests and verify they pass: backend `npm test`, mobile `npm test`
- [x] Document test commands in CLAUDE.md

### 1.6 Database Setup (if not using hosted)
- [ ] Install PostgreSQL locally or use Docker (manual step - see backend/README.md)
- [ ] Create `sigil_dev` database (manual step - see backend/README.md)
- [x] Install database client library (pg for Node.js)
- [x] Create `backend/src/db.ts` with connection pool
- [x] Add .env file with DATABASE_URL (add .env to .gitignore)
- [x] Test database connection in `db.test.ts`

### 1.7 Documentation
- [x] Update CLAUDE.md with final stack choices and rationale
- [x] Update CLAUDE.md with build commands: `npm run dev`, `npm test`, `npm run lint`
- [x] Create backend/README.md with setup instructions
- [x] Create mobile/README.md with setup instructions

## Success Criteria
- Stack is chosen and documented in CLAUDE.md
- Backend and mobile projects exist and build without errors
- Backend server starts and responds on GET /
- Mobile app runs on at least one simulator
- At least 3 tests pass (1 util, 1 API, 1 component)
- All build, test, and lint commands documented
- Database connection works (if self-hosted)
