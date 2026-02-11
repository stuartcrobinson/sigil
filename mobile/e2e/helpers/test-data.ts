/**
 * Test data generators and utilities
 */

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
}

export interface TestActivity {
  sport: string;
  duration: number;
  distance?: number;
  notes?: string;
}

/**
 * Generates a random display name for testing
 */
export function generateDisplayName(): string {
  const adjectives = ['Happy', 'Swift', 'Strong', 'Brave', 'Wise'];
  const nouns = ['Runner', 'Cyclist', 'Swimmer', 'Athlete', 'Warrior'];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);

  return `${adj}${noun}${num}`;
}

/**
 * Default test password (meets all requirements)
 */
export const TEST_PASSWORD = 'TestPass123!';

/**
 * Creates a test user object
 */
export function createTestUser(email: string): TestUser {
  return {
    email,
    password: TEST_PASSWORD,
    displayName: generateDisplayName(),
  };
}

/**
 * Sample test activities
 */
export const TEST_ACTIVITIES: TestActivity[] = [
  {
    sport: 'Running',
    duration: 30,
    distance: 5.0,
    notes: 'Morning run in the park',
  },
  {
    sport: 'Cycling',
    duration: 60,
    distance: 20.0,
    notes: 'Evening bike ride',
  },
  {
    sport: 'Swimming',
    duration: 45,
    distance: 2.0,
    notes: 'Lap swimming at the pool',
  },
  {
    sport: 'Yoga',
    duration: 60,
    notes: 'Vinyasa flow session',
  },
];

/**
 * Waits for a condition to be true
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait
 * @param intervalMs - How often to check condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Sleeps for a specified duration
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
