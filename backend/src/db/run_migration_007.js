import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration007() {
  const client = await pool.connect();
  
  try {
    console.log('Running migration 007: User Payment Methods...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '007_user_payment_methods.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('Migration 007 completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 007 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration007()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
