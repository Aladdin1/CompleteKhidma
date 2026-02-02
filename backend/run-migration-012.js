/**
 * Run only migration 012 (user account status + support tickets).
 * Use when schema_migrations is out of sync with an existing DB.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const client = await pool.connect();
  const file = '012_user_account_status_and_support_tickets.sql';
  const migrationPath = path.join(__dirname, 'src/db/migrations', file);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [file]
    );
    await client.query('COMMIT');
    console.log('✅ Migration 012 applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 012 failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
