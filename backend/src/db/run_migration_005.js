import pool from '../config/database.js';

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Dropping old constraint...');
    await client.query('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key');
    
    console.log('Adding new composite unique constraint...');
    await client.query('ALTER TABLE reviews ADD CONSTRAINT reviews_booking_reviewer_unique UNIQUE (booking_id, reviewer_id)');
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
