# Sigil — Free Nonprofit Fitness App

A free, donation-funded fitness app. No paywalls on fitness features. Ever.

## Features

- **Running/Walking/Biking** — GPS route tracking, pace, splits, elevation, in-activity photo capture
- **Weightlifting** — Exercise picker, sets/reps/weight, < 5 taps per set
- **Yoga** — Session timer, pose sequences, guided flow
- **Social Feed** — Like, comment, high-five. Follow friends. Filter by sport
- **Privacy Controls** — Public, friends-only, or private per activity

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env    # configure DATABASE_URL
npm run migrate
npm run seed            # create test users and sample data
npm run dev             # start on :3000
```

### Mobile
```bash
cd mobile
npm install
npm start               # start Metro bundler
npm run ios             # or: npm run android
```

### Test Users (after seeding)
| Email | Password |
|-------|----------|
| test@sigil.app | TestPass123! |
| alice@sigil.app | TestPass123! |
| bob@sigil.app | TestPass123! |
| carol@sigil.app | TestPass123! |
| m@m.m | mmmmmmm& |
| n@n.n | nnnnnnn& |
| q@q.q | qqqqqqq& |

## Tests
```bash
cd backend && npm test          # 317+ backend tests
cd mobile && npm test           # 281+ mobile tests
cd mobile && npx playwright test # ~110 E2E API tests
```

## Architecture
- **Mobile**: React Native + Expo (iOS/Android/Web)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt

## CI/CD
- Push to `main` → auto-deploy to production
- Push to `staging` → auto-deploy to staging

See [phases master checklist](docs/phases_master_checklist.md) for detailed progress.

## License
AGPL-3.0 — free forever, open source forever.
