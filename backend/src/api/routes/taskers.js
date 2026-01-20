import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/v1/taskers/me/profile
 * Get my tasker profile
 */
router.get('/me/profile', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get tasker profile
    const profileResult = await pool.query(
      `SELECT tp.*, u.phone, u.email, u.full_name, u.locale
       FROM tasker_profiles tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Tasker profile not found'
        }
      });
    }

    const profile = profileResult.rows[0];

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
        average: parseFloat(profile.rating_avg),
        count: profile.rating_count
      },
      acceptance_rate: parseFloat(profile.acceptance_rate),
      completion_rate: parseFloat(profile.completion_rate)
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
 */
router.get('/me/tasks/available', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    // Get tasker service area
    const serviceAreaResult = await pool.query(
      'SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1',
      [userId]
    );

    if (serviceAreaResult.rows.length === 0) {
      return res.json(formatPaginatedResponse([], null));
    }

    const { center_lat, center_lng, radius_km } = serviceAreaResult.rows[0];

    // Get tasker categories
    const categoriesResult = await pool.query(
      'SELECT category FROM tasker_categories WHERE tasker_id = $1',
      [userId]
    );
    const categories = categoriesResult.rows.map(r => r.category);

    // Query tasks in service area
    // Using simple distance calculation (Haversine would be better with PostGIS)
    let query = `
      SELECT t.*, 
        (6371 * acos(
          cos(radians($1)) * cos(radians(t.lat)) *
          cos(radians(t.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(t.lat))
        )) AS distance_km
      FROM tasks t
      WHERE t.state IN ('posted', 'matching')
        AND t.city IN (SELECT DISTINCT city FROM tasks WHERE client_id != $3)
    `;

    const params = [center_lat, center_lng, userId];
    let paramIndex = 4;

    if (categories.length > 0) {
      query += ` AND t.category = ANY($${paramIndex})`;
      params.push(categories);
      paramIndex++;
    }

    if (cursor) {
      query += ` AND t.created_at < (SELECT created_at FROM tasks WHERE id = $${paramIndex})`;
      params.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const tasks = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? tasks[tasks.length - 1].id : null;

    // Format tasks
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      client_id: task.client_id,
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

    res.json(formatPaginatedResponse(formattedTasks, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/taskers/me/tasks/offered
 * Get tasks specifically offered to this tasker
 */
router.get('/me/tasks/offered', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    let query = `
      SELECT t.*, tc.rank, tc.score, tc.explanation
      FROM tasks t
      JOIN task_candidates tc ON t.id = tc.task_id
      WHERE tc.tasker_id = $1 AND t.state = 'matching'
    `;

    const params = [userId];

    if (cursor) {
      query += ` AND t.created_at < (SELECT created_at FROM tasks WHERE id = $2)`;
      params.push(cursor);
    }

    query += ` ORDER BY tc.rank ASC, t.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const tasks = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? tasks[tasks.length - 1].id : null;

    const formattedTasks = tasks.map(task => ({
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
      rank: task.rank,
      score: parseFloat(task.score),
      created_at: task.created_at
    }));

    res.json(formatPaginatedResponse(formattedTasks, nextCursor));
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
