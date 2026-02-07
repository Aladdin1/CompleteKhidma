import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_additional_tables.sql',
  '003_user_addresses.sql',
  '004_bookings_arrived_at.sql',
  '005_fix_reviews_unique_constraint.sql',
  '006_fix_bookings_unique_constraint.sql',
  '007_user_payment_methods.sql',
  '008_oauth_support.sql',
  '009_task_bids.sql',
  '010_task_bid_mode.sql',
  '011_tasker_verification_workflow.sql',
  '012_user_account_status_and_support_tickets.sql',
  '013_support_tickets_extended.sql',
  '014_customer_service_role.sql',
  '015_tasker_verification_documents.sql'
];

async function migrate() {
  const client = await pool.connect();

  try {
    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const migrationFile of MIGRATIONS) {
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);
      if (!fs.existsSync(migrationPath)) continue;

      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [migrationFile]
      );
      if (rows.length > 0) {
        console.log(`Skipping (already applied): ${migrationFile}`);
        continue;
      }

      console.log(`Running migration: ${migrationFile}`);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(migrationSQL);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [migrationFile]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
