import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole, optionalAuth } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/v1/taskers/list?category=cleaning
 * List taskers by category (public discovery for /services). Optional auth.
 */
router.get('/list', optionalAuth, async (req, res, next) => {
  try {
    const { category } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_CATEGORY',
          message: 'Query parameter "category" is required (e.g. ?category=cleaning).'
        }
      });
    }

    const slug = String(category).trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: 'Category cannot be empty.' }
      });
    }

    const completedResult = await pool.query(
      `SELECT b.tasker_id, COUNT(*)::int AS completed_count
       FROM bookings b
       WHERE b.status = 'completed'
       GROUP BY b.tasker_id`
    );
    const completedMap = Object.fromEntries(
      completedResult.rows.map((r) => [r.tasker_id, r.completed_count])
    );

    const taskersResult = await pool.query(
      `SELECT u.id AS user_id, u.full_name,
              tp.rating_avg, tp.rating_count, tp.status AS tasker_status
       FROM users u
       JOIN tasker_profiles tp ON tp.user_id = u.id
       JOIN tasker_categories tc ON tc.tasker_id = u.id AND LOWER(TRIM(tc.category)) = $1
       WHERE u.role = 'tasker'
         AND tp.status IN ('applied', 'verified', 'active')
       ORDER BY tp.rating_avg DESC NULLS LAST, tp.rating_count DESC
       LIMIT $2`,
      [slug, limit]
    );

    const items = taskersResult.rows.map((row) => ({
      id: row.user_id,
      user_id: row.user_id,
      name: row.full_name || 'Tasker',
      full_name: row.full_name || 'Tasker',
      rating: parseFloat(row.rating_avg) || 0,
      reviews: parseInt(row.rating_count, 10) || 0,
      completedTasks: completedMap[row.user_id] || 0,
      hourlyRate: null,
      image: null,
      distance: null
    }));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/profile
 * Get my tasker profile
 * NOTE: Must be defined BEFORE /:tasker_id/profile to prevent route conflict
 */
router.get('/me/profile', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // Validate userId is present and is a valid UUID
    if (!userId) {
      console.error('No user ID in request:', req.user);
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID not found in authentication token'
        }
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error(`Invalid userId format: "${userId}", user object:`, req.user);
      return res.status(400).json({
        error: {
          code: 'INVALID_USER_ID',
          message: `Invalid user ID format: "${userId}". Expected a valid UUID. This suggests the authentication token has an invalid user ID.`
        }
      });
    }

    // Get tasker profile
    console.log(`Loading tasker profile for userId: ${userId} (type: ${typeof userId})`);
    let profileResult;
    try {
      profileResult = await pool.query(
        `SELECT tp.*, u.phone, u.email, u.full_name, u.locale
         FROM tasker_profiles tp
         JOIN users u ON tp.user_id = u.id
         WHERE tp.user_id = $1`,
        [userId]
      );
    } catch (queryError) {
      // Catch UUID errors specifically
      if (queryError.message && queryError.message.includes('invalid input syntax for type uuid')) {
        console.error('UUID validation error in tasker profile query:', {
          userId,
          error: queryError.message,
          userObject: req.user
        });
        return res.status(400).json({
          error: {
            code: 'INVALID_USER_ID',
            message: `Invalid user ID format: "${userId}". Expected a valid UUID. This suggests the authentication token has an invalid user ID.`
          }
        });
      }
      throw queryError; // Re-throw other errors
    }

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Tasker profile not found'
        }
      });
    }

    const profile = profileResult.rows[0];

    // Get booking statistics including rates
    // Note: All bookings start as 'offered', so we count all bookings (except disputed) as offers
    const bookingStatsResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'offered' THEN 1 END) as offered_count,
        COUNT(CASE WHEN status IN ('accepted', 'confirmed', 'in_progress', 'completed') THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status NOT IN ('disputed') THEN 1 END) as total_offers,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN agreed_rate_amount ELSE 0 END), 0) as total_earnings
       FROM bookings
       WHERE tasker_id = $1`,
      [userId]
    );

    const bookingStats = bookingStatsResult.rows[0] || {};
    const totalOffers = parseInt(bookingStats.total_offers) || 0;
    const offeredCount = parseInt(bookingStats.offered_count) || 0;
    const acceptedCount = parseInt(bookingStats.accepted_count) || 0;
    const completedCount = parseInt(bookingStats.completed_count) || 0;

    // Calculate rates
    // Acceptance rate: accepted / total_offers - percentage of offers that were accepted
    // Total offers includes all bookings (offered, accepted, canceled, etc.) except disputed
    const acceptanceRate = totalOffers > 0
      ? Math.min(acceptedCount / totalOffers, 1.0)
      : 0.0;

    // Completion rate: completed / accepted - percentage of accepted bookings that were completed
    // If no accepted bookings, rate is 0
    const completionRate = acceptedCount > 0
      ? Math.min(completedCount / acceptedCount, 1.0)
      : 0.0;

    // Get categories
    const categoriesResult = await pool.query(
      'SELECT category FROM tasker_categories WHERE tasker_id = $1',
      [userId]
    );

    // Get skills
    const skillsResult = await pool.query(
      'SELECT skill FROM tasker_skills WHERE tasker_id = $1',
      [userId]
    );

    // Get service area
    const serviceAreaResult = await pool.query(
      'SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1',
      [userId]
    );

    res.json({
      user_id: profile.user_id,
      status: profile.status,
      bio: profile.bio,
      categories: categoriesResult.rows.map(r => r.category),
      skills: skillsResult.rows.map(r => r.skill),
      service_area: serviceAreaResult.rows.length > 0 ? {
        center: {
          lat: serviceAreaResult.rows[0].center_lat,
          lng: serviceAreaResult.rows[0].center_lng
        },
        radius_km: serviceAreaResult.rows[0].radius_km
      } : null,
      rating: {
        average: parseFloat(profile.rating_avg) || 0,
        count: profile.rating_count || 0
      },
      stats: {
        acceptance_rate: acceptanceRate,
        completion_rate: completionRate,
        offered_bookings_count: offeredCount,
        completed_tasks_count: completedCount,
        total_earnings: parseInt(bookingStats.total_earnings) || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/:tasker_id/profile
 * Get tasker profile (for clients to view tasker details)
 * Per user story US-C-012: "As a client, I want to view tasker profiles with ratings, reviews, and skills"
 */
router.get('/:tasker_id/profile', authenticate, async (req, res, next) => {
  try {
    let { tasker_id } = req.params;

    // Handle "me" - redirect to authenticated user's profile (fallback if route order is wrong)
    if (tasker_id === 'me') {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      // Use authenticated user's ID
      tasker_id = userId;
    }

    // Validate tasker_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tasker_id)) {
      console.error(`Invalid tasker_id format: "${tasker_id}"`);
      return res.status(400).json({
        error: {
          code: 'INVALID_UUID',
          message: `Invalid tasker ID format: "${tasker_id}". Expected a valid UUID or "me".`
        }
      });
    }

    // Get tasker profile
    const profileResult = await pool.query(
      `SELECT tp.*, u.phone, u.email, u.full_name, u.locale, uv.verification_status, uv.verified_at
       FROM tasker_profiles tp
       JOIN users u ON tp.user_id = u.id
       LEFT JOIN user_verifications uv ON tp.user_id = uv.user_id
       WHERE tp.user_id = $1`,
      [tasker_id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tasker profile not found'
        }
      });
    }

    const profile = profileResult.rows[0];

    // Get booking statistics including rates for clients to see
    // Note: All bookings start as 'offered', so we count all bookings (except disputed) as offers
    const bookingStatsResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'offered' THEN 1 END) as offered_count,
        COUNT(CASE WHEN status IN ('accepted', 'confirmed', 'in_progress', 'completed') THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status NOT IN ('disputed') THEN 1 END) as total_offers
       FROM bookings
       WHERE tasker_id = $1`,
      [tasker_id]
    );

    const bookingStats = bookingStatsResult.rows[0];
    const totalOffers = parseInt(bookingStats.total_offers) || 0;
    const acceptedCount = parseInt(bookingStats.accepted_count) || 0;
    const completedCount = parseInt(bookingStats.completed_count) || 0;

    // Calculate rates dynamically
    // Acceptance rate: accepted / total_offers - percentage of offers that were accepted
    const acceptanceRate = totalOffers > 0 
      ? Math.min(acceptedCount / totalOffers, 1.0) 
      : 0.0;

    // Completion rate: completed / accepted - percentage of accepted bookings that were completed
    const completionRate = acceptedCount > 0 
      ? Math.min(completedCount / acceptedCount, 1.0) 
      : 0.0;

    // Get categories, skills, and service area
    const [categoriesResult, skillsResult, serviceAreaResult] = await Promise.all([
      pool.query('SELECT category FROM tasker_categories WHERE tasker_id = $1', [tasker_id]),
      pool.query('SELECT skill FROM tasker_skills WHERE tasker_id = $1', [tasker_id]),
      pool.query('SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1', [tasker_id])
    ]);

    res.json({
      user_id: profile.user_id,
      full_name: profile.full_name,
      phone: profile.phone, // Clients can see phone for contact
      bio: profile.bio,
      status: profile.status,
      categories: categoriesResult.rows.map(r => r.category),
      skills: skillsResult.rows.map(r => r.skill),
      service_area: serviceAreaResult.rows.length > 0 ? {
        center: {
          lat: serviceAreaResult.rows[0].center_lat,
          lng: serviceAreaResult.rows[0].center_lng
        },
        radius_km: serviceAreaResult.rows[0].radius_km
      } : null,
      rating: {
        average: parseFloat(profile.rating_avg) || 0,
        count: profile.rating_count || 0
      },
      verification: {
        status: profile.verification_status || 'unverified',
        verified_at: profile.verified_at,
        is_verified: profile.verification_status === 'verified' || profile.status === 'verified'
      },
      stats: {
        acceptance_rate: acceptanceRate,
        completion_rate: completionRate
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/taskers/me/profile
 * Update tasker profile
 */
router.patch('/me/profile', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { categories, skills, service_area, bio } = z.object({
      categories: z.array(z.string()).optional(),
      skills: z.array(z.string()).optional(),
      service_area: z.object({
        center: z.object({
          lat: z.number(),
          lng: z.number()
        }),
        radius_km: z.number()
      }).optional(),
      bio: z.string().optional()
    }).parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update bio if provided
      if (bio !== undefined) {
        await client.query(
          'UPDATE tasker_profiles SET bio = $1, updated_at = now() WHERE user_id = $2',
          [bio, userId]
        );
      }

      // Update categories
      if (categories !== undefined) {
        await client.query('DELETE FROM tasker_categories WHERE tasker_id = $1', [userId]);
        if (categories.length > 0) {
          const values = categories.map((cat, i) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO tasker_categories (tasker_id, category) VALUES ${values}`,
            [userId, ...categories]
          );
        }
      }

      // Update skills
      if (skills !== undefined) {
        await client.query('DELETE FROM tasker_skills WHERE tasker_id = $1', [userId]);
        if (skills.length > 0) {
          const values = skills.map((skill, i) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO tasker_skills (tasker_id, skill) VALUES ${values}`,
            [userId, ...skills]
          );
        }
      }

      // Update service area
      if (service_area !== undefined) {
        await client.query(
          `INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tasker_id) 
           DO UPDATE SET center_lat = $2, center_lng = $3, radius_km = $4`,
          [userId, service_area.center.lat, service_area.center.lng, service_area.radius_km]
        );
      }

      await client.query('COMMIT');

      // Return updated profile
      const profileResult = await pool.query(
        `SELECT tp.*, u.phone, u.email, u.full_name, u.locale
         FROM tasker_profiles tp
         JOIN users u ON tp.user_id = u.id
         WHERE tp.user_id = $1`,
        [userId]
      );

      const profile = profileResult.rows[0];
      const categoriesResult = await pool.query(
        'SELECT category FROM tasker_categories WHERE tasker_id = $1',
        [userId]
      );
      const skillsResult = await pool.query(
        'SELECT skill FROM tasker_skills WHERE tasker_id = $1',
        [userId]
      );
      const serviceAreaResult = await pool.query(
        'SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1',
        [userId]
      );

      res.json({
        user_id: profile.user_id,
        status: profile.status,
        bio: profile.bio,
        categories: categoriesResult.rows.map(r => r.category),
        skills: skillsResult.rows.map(r => r.skill),
        service_area: serviceAreaResult.rows.length > 0 ? {
          center: {
            lat: serviceAreaResult.rows[0].center_lat,
            lng: serviceAreaResult.rows[0].center_lng
          },
          radius_km: serviceAreaResult.rows[0].radius_km
        } : null,
        rating: {
          average: parseFloat(profile.rating_avg),
          count: profile.rating_count
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/tasks/available
 * Get available tasks for tasker (in their service area)
 * US-T-082: filter by category, max_distance_km, min_price, max_price, starts_after, starts_before, sort
 * US-T-084: include client_name
 */
router.get('/me/tasks/available', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;
    const {
      category,
      max_distance_km,
      min_price,
      max_price,
      starts_after,
      starts_before,
      sort
    } = req.query;

    const serviceAreaResult = await pool.query(
      'SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1',
      [userId]
    );

    if (serviceAreaResult.rows.length === 0) {
      return res.json(formatPaginatedResponse([], null));
    }

    const { center_lat, center_lng, radius_km } = serviceAreaResult.rows[0];

    const categoriesResult = await pool.query(
      'SELECT category FROM tasker_categories WHERE tasker_id = $1',
      [userId]
    );
    const categories = categoriesResult.rows.map(r => r.category);

    let query = `
      SELECT t.*, u.full_name AS client_name,
        (6371 * acos(
          cos(radians($1)) * cos(radians(t.lat)) *
          cos(radians(t.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(t.lat))
        )) AS distance_km
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      WHERE t.state IN ('posted', 'matching')
        AND COALESCE(t.bid_mode, 'invite_only') = 'open_for_bids'
        AND (6371 * acos(
          cos(radians($1)) * cos(radians(t.lat)) *
          cos(radians(t.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(t.lat))
        )) <= $3
    `;

    const params = [center_lat, center_lng, max_distance_km ? Math.min(Number(max_distance_km), radius_km) : radius_km];
    let paramIndex = 4;

    if (categories.length > 0) {
      query += ` AND t.category = ANY($${paramIndex})`;
      params.push(categories);
      paramIndex++;
    }

    if (category) {
      query += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (min_price != null && min_price !== '') {
      query += ` AND t.est_min_amount >= $${paramIndex}`;
      params.push(Number(min_price));
      paramIndex++;
    }

    if (max_price != null && max_price !== '') {
      query += ` AND t.est_max_amount <= $${paramIndex}`;
      params.push(Number(max_price));
      paramIndex++;
    }

    if (starts_after) {
      query += ` AND t.starts_at >= $${paramIndex}::timestamptz`;
      params.push(starts_after);
      paramIndex++;
    }

    if (starts_before) {
      query += ` AND t.starts_at <= $${paramIndex}::timestamptz`;
      params.push(starts_before);
      paramIndex++;
    }

    if (cursor) {
      query += ` AND t.created_at < (SELECT created_at FROM tasks WHERE id = $${paramIndex})`;
      params.push(cursor);
      paramIndex++;
    }

    const orderBy = sort === 'distance_asc'
      ? 'distance_km ASC, t.created_at DESC'
      : sort === 'price_asc'
        ? 't.est_min_amount ASC, t.created_at DESC'
        : sort === 'price_desc'
          ? 't.est_max_amount DESC, t.created_at DESC'
          : 't.created_at DESC';
    query += ` ORDER BY ${orderBy} LIMIT $${paramIndex}`;
    params.push(limit + 1);

    // Build count query with same filters but just COUNT
    let countQuery = `
      SELECT COUNT(*) as total
      FROM tasks t
      WHERE t.state IN ('posted', 'matching')
        AND COALESCE(t.bid_mode, 'invite_only') = 'open_for_bids'
        AND (6371 * acos(
          cos(radians($1)) * cos(radians(t.lat)) *
          cos(radians(t.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(t.lat))
        )) <= $3
    `;
    const countParams = [center_lat, center_lng, max_distance_km ? Math.min(Number(max_distance_km), radius_km) : radius_km];
    let countParamIndex = 4;

    if (categories.length > 0) {
      countQuery += ` AND t.category = ANY($${countParamIndex})`;
      countParams.push(categories);
      countParamIndex++;
    }

    if (category) {
      countQuery += ` AND t.category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (min_price != null && min_price !== '') {
      countQuery += ` AND t.est_min_amount >= $${countParamIndex}`;
      countParams.push(Number(min_price));
      countParamIndex++;
    }

    if (max_price != null && max_price !== '') {
      countQuery += ` AND t.est_max_amount <= $${countParamIndex}`;
      countParams.push(Number(max_price));
      countParamIndex++;
    }

    if (starts_after) {
      countQuery += ` AND t.starts_at >= $${countParamIndex}::timestamptz`;
      countParams.push(starts_after);
      countParamIndex++;
    }

    if (starts_before) {
      countQuery += ` AND t.starts_at <= $${countParamIndex}::timestamptz`;
      countParams.push(starts_before);
      countParamIndex++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const tasks = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? tasks[tasks.length - 1].id : null;
    const totalCount = parseInt(countResult.rows[0].total) || 0;

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      client_id: task.client_id,
      client_name: task.client_name || null,
      category: task.category,
      subcategory: task.subcategory,
      description: task.description,
      location: {
        address: task.address,
        point: { lat: task.lat, lng: task.lng },
        city: task.city,
        district: task.district
      },
      schedule: {
        starts_at: task.starts_at,
        flexibility_minutes: task.flexibility_minutes
      },
      pricing: {
        model: task.pricing_model,
        band_id: task.price_band_id,
        estimate: {
          min_total: {
            currency: task.currency,
            amount: task.est_min_amount
          },
          max_total: {
            currency: task.currency,
            amount: task.est_max_amount
          },
          estimated_minutes: task.est_minutes
        }
      },
      state: task.state,
      distance_km: parseFloat(task.distance_km?.toFixed(2)) || null,
      created_at: task.created_at
    }));

    res.json({
      ...formatPaginatedResponse(formattedTasks, nextCursor),
      total_count: totalCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/tasks/open-for-bid
 * Tasks that are open for bids (US-C-102). Any matching tasker can submit a quote.
 * Requires tasks.bid_mode = 'open_for_bids'. Tasker must have matching category and be in range.
 */
router.get('/me/tasks/open-for-bid', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    const serviceAreaResult = await pool.query(
      'SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1',
      [userId]
    );
    if (serviceAreaResult.rows.length === 0) {
      return res.json(formatPaginatedResponse([], null));
    }
    const { center_lat, center_lng, radius_km } = serviceAreaResult.rows[0];

    const categoriesResult = await pool.query(
      'SELECT category FROM tasker_categories WHERE tasker_id = $1',
      [userId]
    );
    const categories = categoriesResult.rows.map(r => r.category);
    if (categories.length === 0) {
      return res.json(formatPaginatedResponse([], null));
    }

    let query = `
      SELECT t.id, t.client_id, t.category, t.subcategory, t.description, t.address, t.city, t.lat, t.lng,
             t.starts_at, t.flexibility_minutes, t.currency, t.est_min_amount, t.est_max_amount, t.est_minutes,
             t.state, t.created_at, u.full_name AS client_name,
             (6371 * acos(cos(radians($1)) * cos(radians(t.lat)) * cos(radians(t.lng) - radians($2)) + sin(radians($1)) * sin(radians(t.lat)))) AS distance_km
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      WHERE t.state IN ('posted', 'matching')
        AND COALESCE(t.bid_mode, 'invite_only') = 'open_for_bids'
        AND t.category = ANY($3)
        AND (6371 * acos(cos(radians($1)) * cos(radians(t.lat)) * cos(radians(t.lng) - radians($2)) + sin(radians($1)) * sin(radians(t.lat)))) <= $4
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.task_id = t.id AND b.status NOT IN ('canceled', 'disputed'))
    `;
    const params = [center_lat, center_lng, categories, radius_km];
    let paramIndex = 5;
    if (cursor) {
      query += ` AND t.created_at < (SELECT created_at FROM tasks WHERE id = $${paramIndex})`;
      params.push(cursor);
      paramIndex++;
    }
    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const rows = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? rows[rows.length - 1]?.id : null;

    const items = rows.map((r) => ({
      id: r.id,
      client_id: r.client_id,
      client_name: r.client_name || null,
      category: r.category,
      subcategory: r.subcategory,
      description: r.description,
      location: { address: r.address, city: r.city, point: { lat: r.lat, lng: r.lng } },
      schedule: { starts_at: r.starts_at, flexibility_minutes: r.flexibility_minutes },
      pricing: {
        estimate: {
          min_total: { currency: r.currency, amount: r.est_min_amount },
          max_total: { currency: r.currency, amount: r.est_max_amount },
        },
        estimated_minutes: r.est_minutes,
      },
      state: r.state,
      distance_km: r.distance_km != null ? parseFloat(Number(r.distance_km).toFixed(2)) : null,
      created_at: r.created_at,
    }));

    res.json(formatPaginatedResponse(items, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/quote-requests
 * Tasks where the client requested a quote from this tasker (task_bids status 'requested').
 * Tasker uses this to see "Client requested a quote — propose your cost" and submit bid.
 */
router.get('/me/quote-requests', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    let query = `
      SELECT t.id, t.client_id, t.category, t.subcategory, t.description, t.address, t.city, t.district, t.lat, t.lng,
             t.starts_at, t.flexibility_minutes, t.currency, t.state, t.created_at,
             b.id AS bid_id, b.status AS bid_status
      FROM task_bids b
      JOIN tasks t ON b.task_id = t.id
      WHERE b.tasker_id = $1 AND b.status = 'requested'
    `;
    const params = [userId];
    let paramIndex = 2;
    if (cursor) {
      query += ` AND b.created_at < (SELECT created_at FROM task_bids WHERE id = $${paramIndex})`;
      params.push(cursor);
      paramIndex++;
    }
    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const rows = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? rows[rows.length - 1]?.bid_id : null;

    const items = rows.map((r) => ({
      bid_id: r.bid_id,
      bid_status: r.bid_status,
      task: {
        id: r.id,
        client_id: r.client_id,
        category: r.category,
        subcategory: r.subcategory,
        description: r.description,
        location: { address: r.address, city: r.city, point: { lat: r.lat, lng: r.lng } },
        schedule: { starts_at: r.starts_at, flexibility_minutes: r.flexibility_minutes },
        currency: r.currency,
        state: r.state,
        created_at: r.created_at,
      },
    }));

    res.json(formatPaginatedResponse(items, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/tasks/offered
 * Get tasks specifically offered to this tasker:
 * - From bookings with status 'offered' (client accepted bid — tasker should confirm)
 * - From task_bids with status 'requested' (client requested a quote — invite_only)
 * - From task_candidates (algo-offered)
 */
router.get('/me/tasks/offered', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    // 1) Tasks where client accepted this tasker's bid (booking status 'offered' — confirm to start)
    const bookingOfferedResult = await pool.query(
      `SELECT t.*, b.id AS booking_id
       FROM tasks t
       JOIN bookings b ON b.task_id = t.id
       WHERE b.tasker_id = $1 AND b.status = 'offered'`,
      [userId]
    );
    const bookingOfferedRows = bookingOfferedResult.rows;

    // 2) Tasks where client requested a quote from this tasker (invite_only flow)
    const quoteRequestedResult = await pool.query(
      `SELECT t.*, b.id AS bid_id, b.created_at AS bid_created_at
       FROM tasks t
       JOIN task_bids b ON b.task_id = t.id
       WHERE b.tasker_id = $1 AND b.status = 'requested' AND t.state IN ('posted', 'matching')`,
      [userId]
    );
    const quoteRequestedRows = quoteRequestedResult.rows;

    // 3) Tasks from task_candidates (algo-offered)
    let candidateQuery = `
      SELECT t.*, tc.rank, tc.score, tc.explanation
      FROM tasks t
      JOIN task_candidates tc ON t.id = tc.task_id
      WHERE tc.tasker_id = $1 AND t.state = 'matching'
    `;
    const candidateParams = [userId];
    if (cursor) {
      candidateQuery += ` AND t.created_at < (SELECT created_at FROM tasks WHERE id = $2)`;
      candidateParams.push(cursor);
    }
    candidateQuery += ` ORDER BY tc.rank ASC, t.created_at DESC LIMIT $${candidateParams.length + 1}`;
    candidateParams.push(limit + 1);
    const candidateResult = await pool.query(candidateQuery, candidateParams);
    const candidateRows = candidateResult.rows;

    const toFormatted = (task, extra) => ({
      id: task.id,
      client_id: task.client_id,
      category: task.category,
      description: task.description,
      location: {
        address: task.address,
        point: { lat: task.lat, lng: task.lng },
        city: task.city
      },
      schedule: {
        starts_at: task.starts_at
      },
      pricing: {
        estimate: {
          min_total: {
            currency: task.currency,
            amount: task.est_min_amount
          },
          max_total: {
            currency: task.currency,
            amount: task.est_max_amount
          }
        }
      },
      state: task.state,
      created_at: task.created_at,
      ...extra
    });

    const bookingOfferedFormatted = bookingOfferedRows.map(r => toFormatted(r, {
      offer_type: 'booking_offered',
      booking_id: r.booking_id,
      bid_id: null,
      rank: null,
      score: null,
      explanation: null
    }));

    const quoteRequestedFormatted = quoteRequestedRows.map(r => toFormatted(r, {
      offer_type: 'quote_request',
      bid_id: r.bid_id,
      booking_id: null,
      rank: null,
      score: null,
      explanation: null
    }));

    const candidateFormatted = candidateRows.map(r => toFormatted(r, {
      offer_type: 'candidate',
      bid_id: null,
      booking_id: null,
      rank: r.rank,
      score: r.score != null ? parseFloat(r.score) : null,
      explanation: r.explanation
    }));

    const seen = new Set(bookingOfferedFormatted.map(t => t.id));
    const quoteOnly = quoteRequestedFormatted.filter(t => !seen.has(t.id));
    quoteOnly.forEach(t => seen.add(t.id));
    const candidatesOnly = candidateFormatted.filter(t => !seen.has(t.id));
    // First page: booking_offered (client accepted — confirm) first, then quote_request, then candidate. Next pages: candidates only.
    const merged = cursor ? candidatesOnly : [...bookingOfferedFormatted, ...quoteOnly, ...candidatesOnly];
    const tasks = merged.slice(0, limit);
    const nextCursor = merged.length > limit ? merged[limit - 1].id : null;

    res.json(formatPaginatedResponse(tasks, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/taskers/apply
 * Apply to become a tasker
 */
router.post('/apply', authenticate, idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { categories, skills, service_area, bio } = z.object({
      categories: z.array(z.string()).min(1),
      skills: z.array(z.string()).optional(),
      service_area: z.object({
        center: z.object({
          lat: z.number(),
          lng: z.number()
        }),
        radius_km: z.number().default(10)
      }),
      bio: z.string().optional()
    }).parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if already applied
      const existingResult = await client.query(
        'SELECT status FROM tasker_profiles WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: 'ALREADY_APPLIED',
            message: 'Tasker profile already exists'
          }
        });
      }

      // Create tasker profile
      await client.query(
        `INSERT INTO tasker_profiles (user_id, status, bio)
         VALUES ($1, 'applied', $2)`,
        [userId, bio || null]
      );

      // Add categories
      if (categories.length > 0) {
        const categoryValues = categories.map((cat, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO tasker_categories (tasker_id, category) VALUES ${categoryValues}`,
          [userId, ...categories]
        );
      }

      // Add skills
      if (skills && skills.length > 0) {
        const skillValues = skills.map((skill, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO tasker_skills (tasker_id, skill) VALUES ${skillValues}`,
          [userId, ...skills]
        );
      }

      // Add service area
      await client.query(
        `INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
         VALUES ($1, $2, $3, $4)`,
        [userId, service_area.center.lat, service_area.center.lng, service_area.radius_km || 10]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Application submitted successfully',
        status: 'applied'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/application-status
 * Get application status
 */
router.get('/me/application-status', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT status FROM tasker_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        applied: false,
        status: null
      });
    }

    res.json({
      applied: true,
      status: result.rows[0].status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/availability
 * Get tasker availability schedule
 */
router.get('/me/availability', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT id, starts_at, ends_at, kind
      FROM tasker_availability_blocks
      WHERE tasker_id = $1
    `;

    const params = [userId];

    if (start_date) {
      query += ` AND starts_at >= $2`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ends_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ' ORDER BY starts_at ASC';

    const result = await pool.query(query, params);

    res.json({
      blocks: result.rows.map(row => ({
        id: row.id,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        kind: row.kind
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/taskers/me/availability/blocks
 * Create availability block
 */
router.post('/me/availability/blocks', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { starts_at, ends_at, kind } = z.object({
      starts_at: z.string().datetime(),
      ends_at: z.string().datetime(),
      kind: z.enum(['available', 'unavailable']).default('available')
    }).parse(req.body);

    const result = await pool.query(
      `INSERT INTO tasker_availability_blocks (id, tasker_id, starts_at, ends_at, kind)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4)
       RETURNING id, starts_at, ends_at, kind`,
      [userId, starts_at, ends_at, kind]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/taskers/me/availability/blocks/:block_id
 * Delete availability block
 */
router.delete('/me/availability/blocks/:block_id', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { block_id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasker_availability_blocks WHERE id = $1 AND tasker_id = $2 RETURNING id',
      [block_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Availability block not found'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Payout routes (mounted here to keep them under /taskers/me)
/**
 * GET /api/v1/taskers/me/earnings
 * Get tasker earnings summary
 */
router.get('/me/earnings', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.agreed_rate_amount ELSE 0 END), 0) as total_earnings,
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as in_progress_bookings
      FROM bookings b
      WHERE b.tasker_id = $1
    `;

    const params = [userId];

    if (start_date) {
      query += ` AND b.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND b.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    const result = await pool.query(query, params);

    // Get pending payouts
    const payoutsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as pending_amount
       FROM payouts
       WHERE tasker_id = $1 AND status IN ('scheduled', 'processing')`,
      [userId]
    );

    res.json({
      total_earnings: parseInt(result.rows[0].total_earnings),
      completed_bookings: parseInt(result.rows[0].completed_bookings),
      in_progress_bookings: parseInt(result.rows[0].in_progress_bookings),
      pending_payouts: parseInt(payoutsResult.rows[0].pending_amount),
      currency: 'EGP'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/payouts
 * Get payout history
 */
router.get('/me/payouts', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    let query = `
      SELECT * FROM payouts
      WHERE tasker_id = $1
    `;

    const params = [userId];

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM payouts WHERE id = $2)`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const payouts = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? payouts[payouts.length - 1].id : null;

    res.json(formatPaginatedResponse(payouts, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/taskers/me/payouts/request
 * Request payout
 */
router.post('/me/payouts/request', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, provider } = z.object({
      amount: z.number().positive(),
      provider: z.string().optional()
    }).parse(req.body);

    // Check available balance (simplified - in production, calculate from ledger)
    const earningsResult = await pool.query(
      `SELECT COALESCE(SUM(agreed_rate_amount), 0) as total_earnings
       FROM bookings
       WHERE tasker_id = $1 AND status = 'completed'`,
      [userId]
    );

    const totalEarnings = parseInt(earningsResult.rows[0].total_earnings);

    const pendingResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as pending
       FROM payouts
       WHERE tasker_id = $1 AND status IN ('scheduled', 'processing')`,
      [userId]
    );

    const pending = parseInt(pendingResult.rows[0].pending);
    const available = totalEarnings - pending;

    if (amount > available) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Available balance: ${available} EGP`
        }
      });
    }

    const payoutId = uuidv4();
    const result = await pool.query(
      `INSERT INTO payouts (
        id, tasker_id, amount, currency, status, provider, scheduled_for
      ) VALUES ($1, $2, $3, 'EGP', 'scheduled', $4, now() + interval '1 day')
      RETURNING *`,
      [payoutId, userId, amount, provider || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
