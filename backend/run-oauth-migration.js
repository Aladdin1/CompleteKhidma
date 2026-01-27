/**
 * Script to run the OAuth migration
 * Run with: node run-oauth-migration.js
 */

import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'khidma',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== Running OAuth Migration ===\n');
    
    // Read the migration file
    const migrationPath = join(__dirname, 'src', 'db', 'migrations', '008_oauth_support.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('Executing migration...');
    await client.query('BEGIN');
    
    // Execute the migration SQL directly
    try {
      await client.query(migrationSQL);
      console.log('✓ Executed migration SQL');
    } catch (err) {
      // If column already exists, that's okay
      if (err.message.includes('already exists') || err.message.includes('duplicate') || err.message.includes('column') && err.message.includes('already')) {
        console.log('⚠️  Some columns/indexes already exist (continuing)');
      } else {
        throw err;
      }
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify the migration
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('oauth_provider', 'oauth_id')
    `);
    
    console.log('Verification:');
    console.log('  oauth_provider column:', verifyResult.rows.some(r => r.column_name === 'oauth_provider') ? '✓' : '✗');
    console.log('  oauth_id column:', verifyResult.rows.some(r => r.column_name === 'oauth_id') ? '✓' : '✗');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
