/**
 * Seed script: creates 20 taskers with real names and demo profile pictures
 * Run: node src/db/seed-taskers.js
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

// Real Arabic/Egyptian names
const TASKER_DATA = [
  { name: 'Ahmed Hassan', phone: '+201012345001', rating: 4.9, reviews: 127, lat: 30.0444, lng: 31.2357, categories: ['cleaning', 'handyman'] },
  { name: 'Mohamed Ali', phone: '+201012345002', rating: 4.8, reviews: 89, lat: 30.0544, lng: 31.2457, categories: ['mounting', 'assembly'] },
  { name: 'Mahmoud Ibrahim', phone: '+201012345003', rating: 5.0, reviews: 203, lat: 30.0344, lng: 31.2257, categories: ['moving', 'delivery'] },
  { name: 'Omar Farouk', phone: '+201012345004', rating: 4.7, reviews: 156, lat: 30.0644, lng: 31.2557, categories: ['painting', 'handyman'] },
  { name: 'Youssef Nabil', phone: '+201012345005', rating: 4.9, reviews: 94, lat: 30.0244, lng: 31.2157, categories: ['plumbing', 'electrical'] },
  { name: 'Khaled Samir', phone: '+201012345006', rating: 4.6, reviews: 178, lat: 30.0744, lng: 31.2657, categories: ['cleaning', 'delivery'] },
  { name: 'Amr Tarek', phone: '+201012345007', rating: 4.8, reviews: 112, lat: 30.0144, lng: 31.2057, categories: ['mounting', 'assembly', 'handyman'] },
  { name: 'Hassan Mostafa', phone: '+201012345008', rating: 4.9, reviews: 145, lat: 30.0844, lng: 31.2757, categories: ['painting', 'cleaning'] },
  { name: 'Tamer Adel', phone: '+201012345009', rating: 4.7, reviews: 201, lat: 30.0044, lng: 31.1957, categories: ['moving', 'delivery', 'handyman'] },
  { name: 'Waleed Karim', phone: '+201012345010', rating: 5.0, reviews: 167, lat: 30.0944, lng: 31.2857, categories: ['plumbing', 'electrical', 'handyman'] },
  { name: 'Samy Fawzy', phone: '+201012345011', rating: 4.8, reviews: 98, lat: 30.0444, lng: 31.2357, categories: ['cleaning', 'assembly'] },
  { name: 'Ramy Hisham', phone: '+201012345012', rating: 4.6, reviews: 134, lat: 30.0544, lng: 31.2457, categories: ['mounting', 'painting'] },
  { name: 'Sherif Magdy', phone: '+201012345013', rating: 4.9, reviews: 189, lat: 30.0344, lng: 31.2257, categories: ['delivery', 'moving'] },
  { name: 'Karim Reda', phone: '+201012345014', rating: 4.7, reviews: 76, lat: 30.0644, lng: 31.2557, categories: ['handyman', 'plumbing'] },
  { name: 'Bassem Nour', phone: '+201012345015', rating: 4.8, reviews: 143, lat: 30.0244, lng: 31.2157, categories: ['electrical', 'mounting'] },
  { name: 'Hany Ashraf', phone: '+201012345016', rating: 4.9, reviews: 165, lat: 30.0744, lng: 31.2657, categories: ['cleaning', 'painting', 'handyman'] },
  { name: 'Maged Sobhy', phone: '+201012345017', rating: 4.6, reviews: 87, lat: 30.0144, lng: 31.2057, categories: ['assembly', 'delivery'] },
  { name: 'Nader Gamal', phone: '+201012345018', rating: 4.8, reviews: 121, lat: 30.0844, lng: 31.2757, categories: ['plumbing', 'electrical', 'mounting'] },
  { name: 'Fady Emad', phone: '+201012345019', rating: 5.0, reviews: 198, lat: 30.0044, lng: 31.1957, categories: ['moving', 'cleaning', 'delivery'] },
  { name: 'Adel Saad', phone: '+201012345020', rating: 4.7, reviews: 109, lat: 30.0944, lng: 31.2857, categories: ['handyman', 'painting', 'assembly'] },
];

// Demo profile pictures using placeholder services
const PROFILE_PICTURES = [
  'https://i.pravatar.cc/150?img=1',
  'https://i.pravatar.cc/150?img=3',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=7',
  'https://i.pravatar.cc/150?img=9',
  'https://i.pravatar.cc/150?img=11',
  'https://i.pravatar.cc/150?img=13',
  'https://i.pravatar.cc/150?img=15',
  'https://i.pravatar.cc/150?img=17',
  'https://i.pravatar.cc/150?img=19',
  'https://i.pravatar.cc/150?img=21',
  'https://i.pravatar.cc/150?img=23',
  'https://i.pravatar.cc/150?img=25',
  'https://i.pravatar.cc/150?img=27',
  'https://i.pravatar.cc/150?img=29',
  'https://i.pravatar.cc/150?img=31',
  'https://i.pravatar.cc/150?img=33',
  'https://i.pravatar.cc/150?img=35',
  'https://i.pravatar.cc/150?img=37',
  'https://i.pravatar.cc/150?img=39',
];

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

async function seedTaskers() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding 20 taskers with real names and profile pictures...\n');

    for (let i = 0; i < TASKER_DATA.length; i++) {
      const tasker = TASKER_DATA[i];
      const id = uuidv4();
      const profilePic = PROFILE_PICTURES[i % PROFILE_PICTURES.length];

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (id, role, phone, full_name, locale, profile_picture_url)
         VALUES ($1, 'tasker', $2, $3, 'ar-EG', $4)
         ON CONFLICT (phone) DO UPDATE 
           SET full_name = EXCLUDED.full_name, 
               role = 'tasker', 
               profile_picture_url = EXCLUDED.profile_picture_url,
               updated_at = now()
         RETURNING id`,
        [id, tasker.phone, tasker.name, profilePic]
      );
      const userId = userResult.rows[0].id;

      // Create tasker profile with ratings
      await client.query(
        `INSERT INTO tasker_profiles (user_id, status, rating_avg, rating_count, acceptance_rate, completion_rate)
         VALUES ($1, 'verified', $2, $3, 0.9, 0.95)
         ON CONFLICT (user_id) DO UPDATE 
           SET status = 'verified', 
               rating_avg = EXCLUDED.rating_avg,
               rating_count = EXCLUDED.rating_count,
               updated_at = now()`,
        [userId, tasker.rating, tasker.reviews]
      );

      // Add categories
      for (const category of tasker.categories) {
        await client.query(
          `INSERT INTO tasker_categories (tasker_id, category) VALUES ($1, $2)
           ON CONFLICT (tasker_id, category) DO NOTHING`,
          [userId, category]
        );
      }

      // Add service area
      await client.query(
        `INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
         VALUES ($1, $2, $3, 15)
         ON CONFLICT (tasker_id) DO UPDATE 
           SET center_lat = $2, center_lng = $3, radius_km = 15`,
        [userId, tasker.lat, tasker.lng]
      );

      // Verify user
      await client.query(
        `INSERT INTO user_verifications (user_id, phone_verified, verification_status, verified_at, updated_at)
         VALUES ($1, true, 'verified', now(), now())
         ON CONFLICT (user_id) DO UPDATE 
           SET verification_status = 'verified', 
               phone_verified = true, 
               verified_at = now(), 
               updated_at = now()`,
        [userId]
      );

      console.log(`  ✓ ${tasker.name} (${tasker.phone}) – Rating: ${tasker.rating} ⭐ (${tasker.reviews} reviews) – ${tasker.categories.join(', ')}`);
    }

    console.log('\n✅ Done! 20 taskers created with real names and profile pictures.');
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTaskers();
