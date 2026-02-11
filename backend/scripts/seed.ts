import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- Seed users ---

const SEED_USERS = [
  { email: 'test@sigil.app', password: 'TestPass123!', name: 'Stuart Test' },
  { email: 'alice@sigil.app', password: 'TestPass123!', name: 'Alice Runner' },
  { email: 'bob@sigil.app', password: 'TestPass123!', name: 'Bob Lifter' },
  { email: 'carol@sigil.app', password: 'TestPass123!', name: 'Carol Yogi' },
  { email: 'm@m.m', password: 'mmmmmmm&', name: 'User M' },
  { email: 'n@n.n', password: 'nnnnnnn&', name: 'User N' },
  { email: 'q@q.q', password: 'qqqqqqq&', name: 'User Q' },
];

const SEED_EMAILS = SEED_USERS.map((u) => u.email);

// --- GPS route helpers (Central Park area) ---

function generateCentralParkRoute(numPoints: number, distanceMeters: number) {
  // Central Park roughly bounded by:
  //   SW corner: 40.7643, -73.9730
  //   NE corner: 40.7968, -73.9490
  // We'll trace a path along the west side of the park heading north
  const startLat = 40.7680;
  const startLng = -73.9718;
  const latRange = 0.020; // ~2.2 km north
  const lngWander = 0.003; // slight east-west wander

  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const lat = startLat + fraction * latRange;
    // add a gentle sine wave for a more realistic path
    const lng = startLng + Math.sin(fraction * Math.PI * 2) * lngWander;
    const elevation = 20 + Math.sin(fraction * Math.PI * 3) * 8; // 12-28m elevation
    const timestamp = new Date(
      Date.now() - (numPoints - i) * 15000 // ~15s between points
    ).toISOString();
    points.push({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      elevation: parseFloat(elevation.toFixed(1)),
      timestamp,
      distance_meters: parseFloat((fraction * distanceMeters).toFixed(1)),
    });
  }
  return points;
}

function generateShortParkRoute(numPoints: number, distanceMeters: number) {
  // Shorter loop near the south end of Central Park
  const startLat = 40.7650;
  const startLng = -73.9760;
  const latRange = 0.010;
  const lngWander = 0.002;

  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const lat = startLat + fraction * latRange;
    const lng = startLng + Math.sin(fraction * Math.PI * 1.5) * lngWander;
    const elevation = 18 + Math.sin(fraction * Math.PI * 2) * 5;
    const timestamp = new Date(
      Date.now() - (numPoints - i) * 12000
    ).toISOString();
    points.push({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      elevation: parseFloat(elevation.toFixed(1)),
      timestamp,
      distance_meters: parseFloat((fraction * distanceMeters).toFixed(1)),
    });
  }
  return points;
}

// --- Dates helper ---

function daysAgo(days: number, hours = 8, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

// --- Main seed function ---

async function seed() {
  console.log('Starting seed...');

  // 1. Clean up existing seed data (by email pattern)
  console.log('Cleaning existing seed data...');

  const existingUsers = await pool.query(
    'SELECT id FROM users WHERE email = ANY($1)',
    [SEED_EMAILS]
  );
  const existingIds = existingUsers.rows.map((r) => r.id);

  if (existingIds.length > 0) {
    // Delete in correct order to respect foreign keys
    await pool.query(
      'DELETE FROM activity_photos WHERE user_id = ANY($1)',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM activity_comments WHERE user_id = ANY($1)',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM activity_likes WHERE user_id = ANY($1)',
      [existingIds]
    );
    // Also delete interactions on activities owned by seed users
    await pool.query(
      'DELETE FROM activity_photos WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ANY($1))',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM activity_comments WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ANY($1))',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM activity_likes WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ANY($1))',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM activities WHERE user_id = ANY($1)',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM follows WHERE follower_id = ANY($1) OR following_id = ANY($1)',
      [existingIds]
    );
    await pool.query(
      'DELETE FROM users WHERE id = ANY($1)',
      [existingIds]
    );
    console.log(`  Cleaned ${existingIds.length} existing seed user(s) and related data`);
  } else {
    console.log('  No existing seed data found');
  }

  // 2. Create users
  console.log('Creating users...');
  const userIds: Record<string, number> = {};

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      [user.email, passwordHash, user.name]
    );
    userIds[user.email] = result.rows[0].id;
    console.log(`  Created user: ${user.name} (${user.email}) -> id ${result.rows[0].id}`);
  }

  const stuartId = userIds['test@sigil.app'];
  const aliceId = userIds['alice@sigil.app'];
  const bobId = userIds['bob@sigil.app'];
  const carolId = userIds['carol@sigil.app'];
  const mId = userIds['m@m.m'];
  const nId = userIds['n@n.n'];
  const qId = userIds['q@q.q'];

  // 3. Create activities
  console.log('Creating activities...');
  const activityIds: Record<string, number> = {};

  // --- Stuart: 2 running activities with GPS ---

  const stuartRun1Start = daysAgo(1, 7, 30);
  const stuartRun1Duration = 2520; // 42 minutes
  const stuartRun1Distance = 8045; // ~5 miles
  const stuartRun1Route = generateCentralParkRoute(30, stuartRun1Distance);
  const r1 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      stuartId, 'running', 'Morning Central Park Loop',
      'Beautiful sunrise run through the park. Legs felt strong today!',
      stuartRun1Start.toISOString(),
      addSeconds(stuartRun1Start, stuartRun1Duration).toISOString(),
      stuartRun1Duration, stuartRun1Distance, 'public',
      JSON.stringify({
        route_points: stuartRun1Route,
        avg_pace_min_per_km: 5.22,
        avg_heart_rate: 152,
        max_heart_rate: 171,
        cadence_spm: 172,
        elevation_gain_meters: 48,
      }),
    ]
  );
  activityIds['stuart_run1'] = r1.rows[0].id;
  console.log(`  Stuart run 1: id ${r1.rows[0].id}`);

  const stuartRun2Start = daysAgo(3, 18, 0);
  const stuartRun2Duration = 1860; // 31 minutes
  const stuartRun2Distance = 5200; // ~3.2 miles
  const stuartRun2Route = generateShortParkRoute(20, stuartRun2Distance);
  const r2 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      stuartId, 'running', 'Evening Recovery Run',
      'Easy pace, focused on keeping heart rate low. Good way to unwind.',
      stuartRun2Start.toISOString(),
      addSeconds(stuartRun2Start, stuartRun2Duration).toISOString(),
      stuartRun2Duration, stuartRun2Distance, 'public',
      JSON.stringify({
        route_points: stuartRun2Route,
        avg_pace_min_per_km: 5.96,
        avg_heart_rate: 138,
        max_heart_rate: 149,
        cadence_spm: 164,
        elevation_gain_meters: 22,
      }),
    ]
  );
  activityIds['stuart_run2'] = r2.rows[0].id;
  console.log(`  Stuart run 2: id ${r2.rows[0].id}`);

  // --- Alice: 2 running, 1 yoga ---

  const aliceRun1Start = daysAgo(0, 6, 15);
  const aliceRun1Duration = 3600; // 60 minutes
  const aliceRun1Distance = 10000; // 10K
  const aliceRun1Route = generateCentralParkRoute(40, aliceRun1Distance);
  const r3 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      aliceId, 'running', '10K Tempo Run',
      'Pushed the pace today. Training for the spring half marathon!',
      aliceRun1Start.toISOString(),
      addSeconds(aliceRun1Start, aliceRun1Duration).toISOString(),
      aliceRun1Duration, aliceRun1Distance, 'public',
      JSON.stringify({
        route_points: aliceRun1Route,
        avg_pace_min_per_km: 6.0,
        avg_heart_rate: 162,
        max_heart_rate: 178,
        cadence_spm: 176,
        elevation_gain_meters: 65,
      }),
    ]
  );
  activityIds['alice_run1'] = r3.rows[0].id;
  console.log(`  Alice run 1: id ${r3.rows[0].id}`);

  const aliceRun2Start = daysAgo(2, 7, 0);
  const aliceRun2Duration = 2100; // 35 minutes
  const aliceRun2Distance = 6400; // ~4 miles
  const r4 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      aliceId, 'running', 'Easy Shake-out Run',
      'Light jog around the neighborhood. Keeping it relaxed before tomorrow\'s tempo.',
      aliceRun2Start.toISOString(),
      addSeconds(aliceRun2Start, aliceRun2Duration).toISOString(),
      aliceRun2Duration, aliceRun2Distance, 'friends',
      JSON.stringify({
        avg_pace_min_per_km: 5.47,
        avg_heart_rate: 135,
        max_heart_rate: 142,
        cadence_spm: 168,
      }),
    ]
  );
  activityIds['alice_run2'] = r4.rows[0].id;
  console.log(`  Alice run 2: id ${r4.rows[0].id}`);

  const aliceYogaStart = daysAgo(1, 19, 0);
  const aliceYogaDuration = 2700; // 45 minutes
  const r5 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      aliceId, 'yoga', 'Post-Run Yoga Flow',
      'Focused on hip openers and hamstring stretches. Recovery is key!',
      aliceYogaStart.toISOString(),
      addSeconds(aliceYogaStart, aliceYogaDuration).toISOString(),
      aliceYogaDuration, null, 'public',
      JSON.stringify({
        yoga_style: 'vinyasa',
        focus_areas: ['hips', 'hamstrings', 'lower back'],
        difficulty: 'intermediate',
      }),
    ]
  );
  activityIds['alice_yoga'] = r5.rows[0].id;
  console.log(`  Alice yoga: id ${r5.rows[0].id}`);

  // --- Bob: 2 weightlifting ---

  const bobLift1Start = daysAgo(0, 10, 0);
  const bobLift1Duration = 3900; // 65 minutes
  const r6 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      bobId, 'weightlifting', 'Upper Body Push Day',
      'Hit a bench PR today! 225 for 3 reps. Feeling unstoppable.',
      bobLift1Start.toISOString(),
      addSeconds(bobLift1Start, bobLift1Duration).toISOString(),
      bobLift1Duration, null, 'public',
      JSON.stringify({
        exercises: [
          { name: 'Bench Press', sets: [
            { weight_kg: 80, reps: 8 },
            { weight_kg: 90, reps: 5 },
            { weight_kg: 95, reps: 5 },
            { weight_kg: 102, reps: 3 },
          ]},
          { name: 'Overhead Press', sets: [
            { weight_kg: 50, reps: 8 },
            { weight_kg: 55, reps: 6 },
            { weight_kg: 55, reps: 6 },
          ]},
          { name: 'Incline Dumbbell Press', sets: [
            { weight_kg: 32, reps: 10 },
            { weight_kg: 32, reps: 10 },
            { weight_kg: 34, reps: 8 },
          ]},
          { name: 'Lateral Raises', sets: [
            { weight_kg: 12, reps: 15 },
            { weight_kg: 12, reps: 15 },
            { weight_kg: 14, reps: 12 },
          ]},
        ],
        total_volume_kg: 4826,
      }),
    ]
  );
  activityIds['bob_lift1'] = r6.rows[0].id;
  console.log(`  Bob lift 1: id ${r6.rows[0].id}`);

  const bobLift2Start = daysAgo(2, 9, 30);
  const bobLift2Duration = 4200; // 70 minutes
  const r7 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      bobId, 'weightlifting', 'Leg Day - Squats & Deads',
      'Solid session. Squat depth is improving. Deadlift felt smooth at 180kg.',
      bobLift2Start.toISOString(),
      addSeconds(bobLift2Start, bobLift2Duration).toISOString(),
      bobLift2Duration, null, 'public',
      JSON.stringify({
        exercises: [
          { name: 'Back Squat', sets: [
            { weight_kg: 100, reps: 8 },
            { weight_kg: 120, reps: 5 },
            { weight_kg: 130, reps: 5 },
            { weight_kg: 140, reps: 3 },
          ]},
          { name: 'Romanian Deadlift', sets: [
            { weight_kg: 120, reps: 8 },
            { weight_kg: 140, reps: 6 },
            { weight_kg: 160, reps: 4 },
            { weight_kg: 180, reps: 2 },
          ]},
          { name: 'Leg Press', sets: [
            { weight_kg: 200, reps: 12 },
            { weight_kg: 220, reps: 10 },
            { weight_kg: 240, reps: 8 },
          ]},
          { name: 'Leg Curl', sets: [
            { weight_kg: 50, reps: 12 },
            { weight_kg: 55, reps: 10 },
            { weight_kg: 55, reps: 10 },
          ]},
        ],
        total_volume_kg: 8540,
      }),
    ]
  );
  activityIds['bob_lift2'] = r7.rows[0].id;
  console.log(`  Bob lift 2: id ${r7.rows[0].id}`);

  // --- Carol: 1 yoga, 1 running ---

  const carolYogaStart = daysAgo(0, 7, 0);
  const carolYogaDuration = 3600; // 60 minutes
  const r8 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      carolId, 'yoga', 'Morning Ashtanga Practice',
      'Full primary series. Really sinking into the practice lately.',
      carolYogaStart.toISOString(),
      addSeconds(carolYogaStart, carolYogaDuration).toISOString(),
      carolYogaDuration, null, 'public',
      JSON.stringify({
        yoga_style: 'ashtanga',
        focus_areas: ['full body', 'breath work', 'flexibility'],
        difficulty: 'advanced',
        series: 'primary',
      }),
    ]
  );
  activityIds['carol_yoga'] = r8.rows[0].id;
  console.log(`  Carol yoga: id ${r8.rows[0].id}`);

  const carolRunStart = daysAgo(1, 17, 30);
  const carolRunDuration = 1500; // 25 minutes
  const carolRunDistance = 3500; // ~2.2 miles
  const carolRunRoute = generateShortParkRoute(15, carolRunDistance);
  const r9 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      carolId, 'running', 'Quick Afternoon Jog',
      'Just needed to clear my head. Short and sweet.',
      carolRunStart.toISOString(),
      addSeconds(carolRunStart, carolRunDuration).toISOString(),
      carolRunDuration, carolRunDistance, 'public',
      JSON.stringify({
        route_points: carolRunRoute,
        avg_pace_min_per_km: 7.14,
        avg_heart_rate: 145,
        max_heart_rate: 158,
        cadence_spm: 160,
        elevation_gain_meters: 15,
      }),
    ]
  );
  activityIds['carol_run'] = r9.rows[0].id;
  console.log(`  Carol run: id ${r9.rows[0].id}`);

  // --- User M: 1 running ---
  const mRunStart = daysAgo(0, 8, 0);
  const mRunDuration = 1800; // 30 minutes
  const mRunDistance = 4500;
  const mRunRoute = generateShortParkRoute(18, mRunDistance);
  const r10 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      mId, 'running', 'Morning Warmup Run',
      'Quick 5K pace to get the day started.',
      mRunStart.toISOString(),
      addSeconds(mRunStart, mRunDuration).toISOString(),
      mRunDuration, mRunDistance, 'public',
      JSON.stringify({
        route_points: mRunRoute,
        avg_pace_min_per_km: 6.67,
        avg_heart_rate: 148,
        max_heart_rate: 165,
        cadence_spm: 170,
        elevation_gain_meters: 18,
      }),
    ]
  );
  activityIds['m_run'] = r10.rows[0].id;
  console.log(`  User M run: id ${r10.rows[0].id}`);

  // --- User N: 1 weightlifting ---
  const nLiftStart = daysAgo(1, 11, 0);
  const nLiftDuration = 3000; // 50 minutes
  const r11 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      nId, 'weightlifting', 'Full Body Session',
      'Kept it simple — compound lifts only.',
      nLiftStart.toISOString(),
      addSeconds(nLiftStart, nLiftDuration).toISOString(),
      nLiftDuration, null, 'public',
      JSON.stringify({
        exercises: [
          { name: 'Deadlift', sets: [
            { weight_kg: 100, reps: 5 },
            { weight_kg: 120, reps: 5 },
            { weight_kg: 140, reps: 3 },
          ]},
          { name: 'Pull-ups', sets: [
            { weight_kg: 0, reps: 10 },
            { weight_kg: 0, reps: 8 },
            { weight_kg: 0, reps: 6 },
          ]},
        ],
        total_volume_kg: 2520,
      }),
    ]
  );
  activityIds['n_lift'] = r11.rows[0].id;
  console.log(`  User N lift: id ${r11.rows[0].id}`);

  // --- User Q: 1 yoga ---
  const qYogaStart = daysAgo(0, 6, 30);
  const qYogaDuration = 2400; // 40 minutes
  const r12 = await pool.query(
    `INSERT INTO activities (user_id, sport_type, title, description, start_time, end_time, duration_seconds, distance_meters, visibility, sport_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      qId, 'yoga', 'Sunrise Flow',
      'Gentle morning flow to start the day right.',
      qYogaStart.toISOString(),
      addSeconds(qYogaStart, qYogaDuration).toISOString(),
      qYogaDuration, null, 'public',
      JSON.stringify({
        yoga_style: 'hatha',
        focus_areas: ['shoulders', 'spine', 'breath'],
        difficulty: 'beginner',
      }),
    ]
  );
  activityIds['q_yoga'] = r12.rows[0].id;
  console.log(`  User Q yoga: id ${r12.rows[0].id}`);

  // 4. Create follow relationships
  console.log('Creating follow relationships...');

  const follows = [
    { follower: aliceId, following: stuartId, label: 'Alice -> Stuart' },
    { follower: bobId, following: stuartId, label: 'Bob -> Stuart' },
    { follower: carolId, following: aliceId, label: 'Carol -> Alice' },
    { follower: stuartId, following: aliceId, label: 'Stuart -> Alice' },
    { follower: mId, following: stuartId, label: 'M -> Stuart' },
    { follower: nId, following: mId, label: 'N -> M' },
    { follower: qId, following: aliceId, label: 'Q -> Alice' },
    { follower: stuartId, following: mId, label: 'Stuart -> M' },
  ];

  for (const f of follows) {
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [f.follower, f.following]
    );
    console.log(`  Follow: ${f.label}`);
  }

  // 5. Create likes and comments
  console.log('Creating likes and comments...');

  // Likes
  const likes = [
    { activityKey: 'stuart_run1', userId: aliceId, type: 'like', label: 'Alice liked Stuart run 1' },
    { activityKey: 'stuart_run1', userId: bobId, type: 'high_five', label: 'Bob high-fived Stuart run 1' },
    { activityKey: 'stuart_run1', userId: carolId, type: 'like', label: 'Carol liked Stuart run 1' },
    { activityKey: 'alice_run1', userId: stuartId, type: 'like', label: 'Stuart liked Alice run 1' },
    { activityKey: 'alice_run1', userId: carolId, type: 'high_five', label: 'Carol high-fived Alice run 1' },
    { activityKey: 'bob_lift1', userId: stuartId, type: 'high_five', label: 'Stuart high-fived Bob lift 1' },
    { activityKey: 'bob_lift1', userId: aliceId, type: 'like', label: 'Alice liked Bob lift 1' },
    { activityKey: 'carol_yoga', userId: aliceId, type: 'like', label: 'Alice liked Carol yoga' },
    { activityKey: 'alice_yoga', userId: carolId, type: 'like', label: 'Carol liked Alice yoga' },
    { activityKey: 'stuart_run2', userId: aliceId, type: 'like', label: 'Alice liked Stuart run 2' },
    { activityKey: 'bob_lift2', userId: carolId, type: 'like', label: 'Carol liked Bob lift 2' },
    { activityKey: 'm_run', userId: stuartId, type: 'like', label: 'Stuart liked M run' },
    { activityKey: 'n_lift', userId: mId, type: 'high_five', label: 'M high-fived N lift' },
    { activityKey: 'q_yoga', userId: aliceId, type: 'like', label: 'Alice liked Q yoga' },
  ];

  for (const like of likes) {
    await pool.query(
      'INSERT INTO activity_likes (activity_id, user_id, like_type) VALUES ($1, $2, $3)',
      [activityIds[like.activityKey], like.userId, like.type]
    );
    console.log(`  ${like.label}`);
  }

  // Comments
  const comments = [
    {
      activityKey: 'stuart_run1', userId: aliceId,
      text: 'Great pace! Central Park is the best in the morning.',
      label: 'Alice commented on Stuart run 1',
    },
    {
      activityKey: 'stuart_run1', userId: bobId,
      text: 'Nice work! You should try adding some hill sprints next time.',
      label: 'Bob commented on Stuart run 1',
    },
    {
      activityKey: 'alice_run1', userId: stuartId,
      text: 'Solid 10K! You are going to crush that half marathon.',
      label: 'Stuart commented on Alice run 1',
    },
    {
      activityKey: 'alice_run1', userId: carolId,
      text: 'Inspiring! I need to work up to that distance.',
      label: 'Carol commented on Alice run 1',
    },
    {
      activityKey: 'bob_lift1', userId: stuartId,
      text: '225 bench?! That is impressive. What program are you running?',
      label: 'Stuart commented on Bob lift 1',
    },
    {
      activityKey: 'bob_lift1', userId: aliceId,
      text: 'Beast mode! Keep it up.',
      label: 'Alice commented on Bob lift 1',
    },
    {
      activityKey: 'carol_yoga', userId: aliceId,
      text: 'Full primary series is no joke. How long have you been practicing Ashtanga?',
      label: 'Alice commented on Carol yoga',
    },
    {
      activityKey: 'alice_yoga', userId: carolId,
      text: 'Recovery yoga is so important. Love that you prioritize it!',
      label: 'Carol commented on Alice yoga',
    },
    {
      activityKey: 'm_run', userId: aliceId,
      text: 'Nice pace! Welcome to the crew.',
      label: 'Alice commented on M run',
    },
    {
      activityKey: 'n_lift', userId: bobId,
      text: 'Solid compound work. Deadlift form is key!',
      label: 'Bob commented on N lift',
    },
  ];

  for (const comment of comments) {
    await pool.query(
      'INSERT INTO activity_comments (activity_id, user_id, text) VALUES ($1, $2, $3)',
      [activityIds[comment.activityKey], comment.userId, comment.text]
    );
    console.log(`  ${comment.label}`);
  }

  // 6. Summary
  console.log('\n--- Seed Complete ---');
  console.log(`Users:        ${SEED_USERS.length}`);
  console.log(`Activities:   ${Object.keys(activityIds).length}`);
  console.log(`Follows:      ${follows.length}`);
  console.log(`Likes:        ${likes.length}`);
  console.log(`Comments:     ${comments.length}`);
  console.log('\nTest credentials:');
  for (const user of SEED_USERS) {
    console.log(`  ${user.email} / ${user.password}  (${user.name})`);
  }
}

seed()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
