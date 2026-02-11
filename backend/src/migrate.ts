import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    console.log(`Found ${files.length} migration file(s)`);

    // Get list of already applied migrations
    const result = await pool.query<{ filename: string }>(
      'SELECT filename FROM migrations'
    );
    const appliedMigrations = new Set(result.rows.map((r) => r.filename));

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      // Skip if already applied
      if (appliedMigrations.has(file)) {
        console.log(`⊘ ${file} already applied, skipping`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);

      // Record that this migration was applied
      await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      console.log(`✓ ${file} completed`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { runMigrations };
