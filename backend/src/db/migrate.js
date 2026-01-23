import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and execute all migration files in order
    const migrations = ['001_initial_schema.sql', '002_additional_tables.sql', '003_user_addresses.sql'];
    
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);
      if (fs.existsSync(migrationPath)) {
        console.log(`Running migration: ${migrationFile}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migrationSQL);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
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
