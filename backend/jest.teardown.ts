import { pool } from './src/db';

export default async function globalTeardown() {
  // Close the database connection pool after all tests complete
  await pool.end();
}
