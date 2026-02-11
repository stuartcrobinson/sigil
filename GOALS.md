# Sigil — Free Nonprofit Fitness App

## Mission
A free, donation-funded fitness app (like Wikipedia for workouts). No paywalls on fitness features. Ever.

## Core Sports
Runners, walkers, HIT/sprinters, weightlifters, swimmers, yoga. Each sport gets a purpose-built UI — not one generic screen forced on everyone.

## Architecture Principles
- Mobile-first (React Native or similar cross-platform)
- REST API backend with auth, social, activity tracking
- Each sport module is self-contained but shares common infrastructure (auth, social, feed)

## Features — MVP

### Activity Tracking (per sport)
- **Running/Walking/Biking** ⭐ PRIORITY: GPS route, pace, splits, elevation, distance, duration
  - **In-Activity Photo Capture**: Take photos mid-run/walk/ride from within the app
  - **GPS-Pinned Photos**: Each photo records exact lat/lng and position along the route
  - **Route Photo Gallery**: View photos placed on the route map after completing an activity
  - **Geo-Fenced Auto Start/Stop**: Set START and STOP waypoints on a map. Activity auto-starts when you reach the START point, and auto-stops when you reach the STOP point (after moving 100+ ft from START first). START and STOP can be the same location (e.g., home). Solves the "forgot to stop my run" problem
  - Goal: Strava feature parity for running/biking/walking FIRST, then expand to other sports
- **Weightlifting**: Exercise picker, sets/reps/weight logging. Must be fast to use mid-workout (minimal typing — tap-based rep counting, quick weight adjustment, rest timer)
- **Swimming**: Laps, stroke type, distance, time per lap (DEFERRED — after core running/biking/walking parity)
- **Yoga**: Session duration, pose sequence, optional guided flow
- **HIT/Sprints**: Interval timer, work/rest tracking, rounds (DEFERRED — after core running/biking/walking parity)

### Social Feed
- Global "all sports" feed
- Filter by sport (only show running, only show lifting, etc.)
- Filter by "friends only" vs "all public"
- Each post has visibility: public / friends-only / private
- Like, comment, high-five
- Follow/unfollow users

### User System
- Sign up / login (email + OAuth)
- Profile: name, photo, preferred sports, bio
- Friend/follow model
- Privacy settings per activity type

### Competitor Feature Parity
Research and match the best features from:
- Strava (running, biking — routes, segments, PRs, pace analysis)
- Strong/Hevy (weightlifting — exercise library, templates, progress charts)
- MySwimPro (swimming — drill tracking, training plans)
- Down Dog (yoga — session customization)

## Strategic Priority Order
1. **Running/Walking/Biking at Strava parity** — GPS tracking, route recording, pace/splits, photo capture mid-activity with GPS pinning
2. **Social Feed Interactions** — likes, comments, high-fives on activities
3. **Remaining Sport Modules** — swimming, HIT/sprints (deferred until core sports are polished)
4. **Post-MVP features** — training plans, progress charts, imports

## Features — Post-MVP
- Training plans and workout templates
- Progress charts and personal records
- Challenges and group events
- Donation page (Stripe/PayPal integration)
- Import from Strava/Garmin/Apple Health

## Definition of Done
- All MVP features implemented and working
- Test suite passes with real coverage (no false positives)
- Mobile app builds and runs on iOS and Android
- API is documented
- Social feed works with filters
- At least 3 sport modules fully implemented with sport-specific UI
- Weightlifting logging takes < 5 taps per set
