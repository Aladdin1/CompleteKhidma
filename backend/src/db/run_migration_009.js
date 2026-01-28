import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration009() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Running migration: 009_task_bids.sql');
    const migrationPath = path.join(__dirname, 'migrations', '009_task_bids.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);

    await client.query('COMMIT');
    console.log('✅ Migration 009 (task_bids) completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration009()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
