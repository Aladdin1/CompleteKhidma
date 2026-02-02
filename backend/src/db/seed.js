/**
 * Seed script: creates Tasker 10 to Tasker 20 in all domains for development.
 * Run: npm run seed
 */
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES = [
  'cleaning',
  'mounting',
  'moving',
  'assembly',
  'delivery',
  'handyman',
  'painting',
  'plumbing',
  'electrical',
];

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

async function seedTaskers() {
  const client = await pool.connect();
  try {
    for (let i = 10; i <= 20; i++) {
      const name = `Tasker ${i}`;
      const phone = `+2010000000${i}`;
      const id = uuidv4();
      // Slight offset per tasker so distance ordering varies (Cairo area)
      const lat = CAIRO_LAT + (i - 15) * 0.01;
      const lng = CAIRO_LNG + (i % 3 - 1) * 0.01;

      const userResult = await client.query(
        `INSERT INTO users (id, role, phone, full_name, locale)
         VALUES ($1, 'tasker', $2, $3, 'ar-EG')
         ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'tasker', updated_at = now()
         RETURNING id`,
        [id, phone, name]
      );
      const userId = userResult.rows[0].id;
      await client.query(
        `INSERT INTO tasker_profiles (user_id, status, rating_avg, rating_count, acceptance_rate, completion_rate)
         VALUES ($1, 'verified', 4.5, 10, 0.9, 0.95)
         ON CONFLICT (user_id) DO UPDATE SET status = 'verified', updated_at = now()`,
        [userId]
      );

      for (const category of CATEGORIES) {
        await client.query(
          `INSERT INTO tasker_categories (tasker_id, category) VALUES ($1, $2)
           ON CONFLICT (tasker_id, category) DO NOTHING`,
          [userId, category]
        );
      }

      await client.query(
        `INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
         VALUES ($1, $2, $3, 15)
         ON CONFLICT (tasker_id) DO UPDATE SET center_lat = $2, center_lng = $3, radius_km = 15`,
        [userId, lat, lng]
      );

      await client.query(
        `INSERT INTO user_verifications (user_id, phone_verified, verification_status, verified_at, updated_at)
         VALUES ($1, true, 'verified', now(), now())
         ON CONFLICT (user_id) DO UPDATE SET verification_status = 'verified', phone_verified = true, verified_at = now(), updated_at = now()`,
        [userId]
      );

      console.log(`  ✓ ${name} (${phone}) – ${CATEGORIES.length} categories`);
    }
    console.log('\nDone. Tasker 10–20 created in all domains.');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTaskers();
