import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole, requireAdminOnly } from '../../middleware/auth.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// All admin routes require admin or ops role
router.use(authenticate);
router.use(requireRole('admin', 'ops'));

/**
 * POST /api/v1/admin/tasks/:task_id/assign
 * Manual task assignment
 */
router.post('/tasks/:task_id/assign', async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { tasker_id, reason } = z.object({
      tasker_id: z.string().uuid(),
      reason: z.string().optional()
    }).parse(req.body);

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [task_id]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    const task = taskResult.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bookingId = uuidv4();
      await client.query(
        `INSERT INTO bookings (id, task_id, tasker_id, status)
         VALUES ($1, $2, $3, 'offered')`,
        [bookingId, task_id, tasker_id]
      );

      // Keep task in matching state until tasker accepts
      // Admin assignment creates an 'offered' booking, tasker must still accept
      // DO NOT update to 'accepted' here

      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id, meta)
         VALUES (uuid_generate_v4(), $1, NULL, 'offered', $2, $3)`,
        [bookingId, req.user.id, JSON.stringify({ reason: reason || 'Manual assignment by ops', admin_assigned: true })]
      );

      await client.query('COMMIT');

      res.json({
        booking_id: bookingId,
        task_id: task_id,
        tasker_id: tasker_id,
        status: 'offered',
        message: 'Task assigned successfully. Tasker must accept the offer before task is confirmed.'
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
 * GET /api/v1/admin/tasks
 * List all tasks.
 * US-A-001: ?active_only=true shows only active tasks (posted, matching, offered, accepted, confirmed, in_progress)
 * US-A-002: ?unfilled_minutes=N shows tasks posted/matching for ≥N minutes with no accept.
 */
router.get('/tasks', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { state, city, unfilled_minutes, active_only } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // US-A-001: Active tasks filter (tasks that are in progress or awaiting action)
    if (active_only === 'true') {
      query += ` AND state IN ('posted', 'matching', 'offered', 'accepted', 'confirmed', 'in_progress')`;
    } else if (state) {
      query += ` AND state = $${paramIndex++}`;
      params.push(state);
    }

    if (city) {
      query += ` AND city = $${paramIndex++}`;
      params.push(city);
    }

    const mins = parseInt(unfilled_minutes, 10);
    if (!Number.isNaN(mins) && mins > 0) {
      query += ` AND state IN ('posted','matching') AND created_at < now() - ($${paramIndex++} || ' minutes')::interval`;
      params.push(String(mins));
    }

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM tasks WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const tasks = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? tasks[tasks.length - 1].id : null;

    res.json(formatPaginatedResponse(tasks, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/tasks/:task_id/cancel
 * US-A-005: Cancel task on behalf of client (ops/admin)
 */
router.post('/tasks/:task_id/cancel', async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { reason } = req.body || {};
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [task_id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }
    const task = taskResult.rows[0];
    if (['completed', 'settled', 'reviewed'].includes(task.state)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: 'Cannot cancel task in current state' }
      });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const newState = 'canceled_by_client';
      await client.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        [newState, task_id]
      );
      await client.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id, reason)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
        [task_id, task.state, newState, req.user.id, reason ? String(reason) : 'Canceled on behalf of client by admin/ops']
      );
      await client.query(
        `UPDATE bookings SET status = 'canceled', updated_at = now()
         WHERE task_id = $1 AND status NOT IN ('completed', 'canceled', 'disputed')`,
        [task_id]
      );
      await client.query(
        `INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, meta)
         VALUES (uuid_generate_v4(), $1, 'cancel_task_on_behalf', 'task', $2, $3)`,
        [req.user.id, task_id, JSON.stringify({ reason: reason || null, client_id: task.client_id })]
      );
      await client.query('COMMIT');
      res.json({ id: task_id, state: newState, message: 'Task canceled on behalf of client' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/tasks/:task_id/history
 * Full task details + task state history + audit entries for admin tasks view.
 * Returns { task, timeline } where task has full fields + client info; timeline merges state_events and audit_log.
 */
router.get('/tasks/:task_id/history', async (req, res, next) => {
  try {
    const { task_id } = req.params;

    const taskResult = await pool.query(
      `SELECT t.*,
              c.full_name AS client_name, c.phone AS client_phone
       FROM tasks t
       LEFT JOIN users c ON c.id = t.client_id
       WHERE t.id = $1`,
      [task_id]
    );
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }
    const row = taskResult.rows[0];
    const taskDetail = {
      id: row.id,
      client_id: row.client_id,
      client_name: row.client_name || row.client_phone || null,
      client_phone: row.client_phone,
      category: row.category,
      subcategory: row.subcategory,
      description: row.description,
      address: row.address,
      city: row.city,
      district: row.district,
      lat: row.lat,
      lng: row.lng,
      starts_at: row.starts_at,
      flexibility_minutes: row.flexibility_minutes,
      pricing_model: row.pricing_model,
      price_band_id: row.price_band_id,
      est_minutes: row.est_minutes,
      est_min_amount: row.est_min_amount,
      est_max_amount: row.est_max_amount,
      currency: row.currency,
      structured_inputs: row.structured_inputs,
      state: row.state,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const eventsResult = await pool.query(
      `SELECT e.id, e.task_id, e.from_state, e.to_state, e.actor_user_id, e.reason, e.meta, e.created_at,
              u.full_name AS actor_name, u.phone AS actor_phone
       FROM task_state_events e
       LEFT JOIN users u ON u.id = e.actor_user_id
       WHERE e.task_id = $1
       ORDER BY e.created_at DESC
       LIMIT 100`,
      [task_id]
    );
    const stateEntries = (eventsResult.rows || []).map((r) => ({
      type: 'state_change',
      id: r.id,
      from_state: r.from_state,
      to_state: r.to_state,
      actor_user_id: r.actor_user_id,
      actor_name: r.actor_name || r.actor_phone || (r.actor_user_id ? `${String(r.actor_user_id).slice(0, 8)}…` : null),
      reason: r.reason,
      meta: r.meta,
      created_at: r.created_at,
    }));

    const auditResult = await pool.query(
      `SELECT a.id, a.actor_user_id, a.action, a.target_type, a.target_id, a.meta, a.created_at,
              u.full_name AS actor_name, u.phone AS actor_phone
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.target_type = 'task' AND a.target_id = $1
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [task_id]
    );
    const auditEntries = (auditResult.rows || []).map((r) => ({
      type: 'audit',
      id: r.id,
      action: r.action,
      actor_user_id: r.actor_user_id,
      actor_name: r.actor_name || r.actor_phone || (r.actor_user_id ? `${String(r.actor_user_id).slice(0, 8)}…` : null),
      meta: r.meta,
      created_at: r.created_at,
    }));

    const timeline = [...stateEntries, ...auditEntries]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ task: taskDetail, timeline });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/bookings
 * List all bookings
 */
router.get('/bookings', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { status } = req.query;

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM bookings WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const bookings = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? bookings[bookings.length - 1].id : null;

    res.json(formatPaginatedResponse(bookings, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users
 * List all users
 */
router.get('/users', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { role } = req.query;

    let query = 'SELECT id, role, phone, email, full_name, locale, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(role);
    }

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM users WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const users = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? users[users.length - 1].id : null;

    res.json(formatPaginatedResponse(users, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users/:user_id
 * US-A-009: View full user profile and history (tasks, bookings, reviews, payments)
 */
router.get('/users/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params;

    // Get user basic info
    const userResult = await pool.query(
      `SELECT id, role, phone, email, full_name, locale, created_at, updated_at
       FROM users WHERE id = $1`,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    const user = userResult.rows[0];

    // Get user addresses
    const addressesResult = await pool.query(
      `SELECT id, label, address_line1, address_line2, city, district, postal_code, country, latitude, longitude, is_default, created_at
       FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [user_id]
    );

    // Get task counts (as client)
    const taskCountsResult = await pool.query(
      `SELECT state, COUNT(*)::int as count
       FROM tasks WHERE client_id = $1 GROUP BY state`,
      [user_id]
    );
    const taskCounts = {
      total: taskCountsResult.rows.reduce((s, r) => s + r.count, 0),
      by_state: taskCountsResult.rows.reduce((acc, r) => { acc[r.state] = r.count; return acc; }, {})
    };

    // Get booking counts (as client or tasker)
    const bookingCountsResult = await pool.query(
      `SELECT 
         CASE WHEN b.tasker_id = $1 THEN 'as_tasker' ELSE 'as_client' END as role_type,
         b.status,
         COUNT(*)::int as count
       FROM bookings b
       JOIN tasks t ON t.id = b.task_id
       WHERE t.client_id = $1 OR b.tasker_id = $1
       GROUP BY role_type, b.status`,
      [user_id]
    );
    const bookingCounts = {
      as_client: {},
      as_tasker: {},
      total_as_client: 0,
      total_as_tasker: 0
    };
    for (const row of bookingCountsResult.rows) {
      if (row.role_type === 'as_client') {
        bookingCounts.as_client[row.status] = row.count;
        bookingCounts.total_as_client += row.count;
      } else {
        bookingCounts.as_tasker[row.status] = row.count;
        bookingCounts.total_as_tasker += row.count;
      }
    }

    // Get reviews received (if tasker)
    const reviewsResult = await pool.query(
      `SELECT 
         COUNT(*)::int as count,
         ROUND(AVG(rating)::numeric, 2) as avg_rating,
         MIN(rating)::int as min_rating,
         MAX(rating)::int as max_rating
       FROM reviews WHERE reviewee_id = $1`,
      [user_id]
    );
    const reviewStats = reviewsResult.rows[0];

    // Get recent reviews (last 10)
    const recentReviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.tags, r.created_at,
              u.full_name as reviewer_name, u.phone as reviewer_phone
       FROM reviews r
       LEFT JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [user_id]
    );

    // Get payment summary
    const paymentSummaryResult = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN t.client_id = $1 THEN b.agreed_rate_amount ELSE 0 END), 0)::bigint as total_spent,
         COALESCE(SUM(CASE WHEN b.tasker_id = $1 THEN b.agreed_rate_amount ELSE 0 END), 0)::bigint as total_earned,
         COUNT(CASE WHEN t.client_id = $1 AND b.status = 'completed' THEN 1 END)::int as completed_as_client,
         COUNT(CASE WHEN b.tasker_id = $1 AND b.status = 'completed' THEN 1 END)::int as completed_as_tasker
       FROM bookings b
       JOIN tasks t ON t.id = b.task_id
       WHERE (t.client_id = $1 OR b.tasker_id = $1) AND b.status = 'completed'`,
      [user_id]
    );
    const paymentSummary = {
      total_spent: parseInt(paymentSummaryResult.rows[0]?.total_spent || 0, 10),
      total_earned: parseInt(paymentSummaryResult.rows[0]?.total_earned || 0, 10),
      completed_as_client: paymentSummaryResult.rows[0]?.completed_as_client || 0,
      completed_as_tasker: paymentSummaryResult.rows[0]?.completed_as_tasker || 0,
      currency: 'EGP'
    };

    // Get tasker profile if user is a tasker
    let taskerProfile = null;
    if (user.role === 'tasker') {
      const taskerResult = await pool.query(
        `SELECT tp.status, tp.bio, tp.created_at as tasker_since,
                uv.phone_verified, uv.verification_status, uv.verified_at
         FROM tasker_profiles tp
         LEFT JOIN user_verifications uv ON uv.user_id = tp.user_id
         WHERE tp.user_id = $1`,
        [user_id]
      );
      if (taskerResult.rows.length > 0) {
        const tp = taskerResult.rows[0];
        const [categoriesResult, skillsResult] = await Promise.all([
          pool.query('SELECT category FROM tasker_categories WHERE tasker_id = $1', [user_id]),
          pool.query('SELECT skill FROM tasker_skills WHERE tasker_id = $1', [user_id])
        ]);
        taskerProfile = {
          status: tp.status,
          bio: tp.bio,
          tasker_since: tp.tasker_since,
          phone_verified: tp.phone_verified,
          verification_status: tp.verification_status,
          verified_at: tp.verified_at,
          categories: categoriesResult.rows.map(r => r.category),
          skills: skillsResult.rows.map(r => r.skill)
        };
      }
    }

    // Get recent activity (last 20 tasks as client or bookings as tasker)
    const recentActivityResult = await pool.query(
      `(
        SELECT 'task' as type, t.id, t.category, t.state::text as status, t.created_at, NULL::uuid as task_id
        FROM tasks t WHERE t.client_id = $1
        ORDER BY t.created_at DESC LIMIT 10
      )
      UNION ALL
      (
        SELECT 'booking' as type, b.id, t.category, b.status::text as status, b.created_at, b.task_id
        FROM bookings b
        JOIN tasks t ON t.id = b.task_id
        WHERE b.tasker_id = $1
        ORDER BY b.created_at DESC LIMIT 10
      )
      ORDER BY created_at DESC
      LIMIT 20`,
      [user_id]
    );

    res.json({
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        email: user.email,
        full_name: user.full_name,
        locale: user.locale,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      addresses: addressesResult.rows,
      task_counts: taskCounts,
      booking_counts: bookingCounts,
      reviews: {
        count: reviewStats?.count || 0,
        avg_rating: reviewStats?.avg_rating ? parseFloat(reviewStats.avg_rating) : null,
        min_rating: reviewStats?.min_rating,
        max_rating: reviewStats?.max_rating,
        recent: recentReviewsResult.rows.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          tags: r.tags,
          reviewer_name: r.reviewer_name || r.reviewer_phone || 'Anonymous',
          created_at: r.created_at
        }))
      },
      payment_summary: paymentSummary,
      tasker_profile: taskerProfile,
      recent_activity: recentActivityResult.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/users/:user_id/suspend
 * Suspend user (admin only; ops cannot perform user-management actions)
 */
router.post('/users/:user_id/suspend', requireAdminOnly, async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { reason } = req.body;

    // Update user role or add suspension flag
    // For now, update tasker status if they are a tasker
    await pool.query(
      `UPDATE tasker_profiles 
       SET status = 'suspended', updated_at = now()
       WHERE user_id = $1`,
      [user_id]
    );

    // Log audit
    await pool.query(
      `INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, meta)
       VALUES (uuid_generate_v4(), $1, 'suspend_user', 'user', $2, $3)`,
      [req.user.id, user_id, JSON.stringify({ reason: reason || null })]
    );

    res.json({
      message: 'User suspended successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/users/:user_id/unsuspend
 * Unsuspend user (admin only; ops cannot perform user-management actions)
 */
router.post('/users/:user_id/unsuspend', requireAdminOnly, async (req, res, next) => {
  try {
    const { user_id } = req.params;

    await pool.query(
      `UPDATE tasker_profiles 
       SET status = 'active', updated_at = now()
       WHERE user_id = $1`,
      [user_id]
    );

    await pool.query(
      `INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id)
       VALUES (uuid_generate_v4(), $1, 'unsuspend_user', 'user', $2)`,
      [req.user.id, user_id]
    );

    res.json({
      message: 'User unsuspended successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/taskers/pending
 * List taskers pending verification (status = applied). US-A-008.
 */
router.get('/taskers/pending', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { include_rejected } = req.query;

    let query = `
      SELECT tp.user_id, tp.status, tp.bio, tp.created_at, tp.updated_at,
             tp.rejection_reason, tp.rejected_at,
             u.phone, u.email, u.full_name, u.locale,
             uv.phone_verified, uv.verification_status, uv.national_id_last4, uv.verified_at
      FROM tasker_profiles tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN user_verifications uv ON uv.user_id = tp.user_id
      WHERE tp.status = 'applied'
    `;
    const params = [];
    let paramIndex = 1;

    if (include_rejected !== 'true') {
      query += ` AND tp.rejected_at IS NULL`;
    }

    if (cursor) {
      query += ` AND tp.created_at > $${paramIndex++}`;
      params.push(cursor);
    }

    query += ` ORDER BY tp.created_at ASC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const rows = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? rows[rows.length - 1].created_at : null;

    const items = rows.map((row) => ({
      user_id: row.user_id,
      full_name: row.full_name || row.phone || '—',
      phone: row.phone,
      email: row.email,
      bio: row.bio,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rejection_reason: row.rejection_reason,
      rejected_at: row.rejected_at,
      phone_verified: row.phone_verified || false,
      verification_status: row.verification_status || 'unverified',
      national_id_last4: row.national_id_last4,
    }));

    res.json(formatPaginatedResponse(items, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/taskers/:user_id
 * Get tasker detail for verification review (categories, skills, service area).
 */
router.get('/taskers/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const profileResult = await pool.query(
      `SELECT tp.*, u.phone, u.email, u.full_name, u.locale,
              uv.phone_verified, uv.verification_status, uv.national_id_last4, uv.verified_at
       FROM tasker_profiles tp
       JOIN users u ON u.id = tp.user_id
       LEFT JOIN user_verifications uv ON uv.user_id = tp.user_id
       WHERE tp.user_id = $1`,
      [user_id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tasker not found' }
      });
    }

    const row = profileResult.rows[0];

    const [categoriesResult, skillsResult, areaResult] = await Promise.all([
      pool.query('SELECT category FROM tasker_categories WHERE tasker_id = $1', [user_id]),
      pool.query('SELECT skill FROM tasker_skills WHERE tasker_id = $1', [user_id]),
      pool.query(
        'SELECT center_lat, center_lng, radius_km FROM tasker_service_areas WHERE tasker_id = $1',
        [user_id]
      )
    ]);

    const profile = {
      user_id: row.user_id,
      full_name: row.full_name || row.phone || '—',
      phone: row.phone,
      email: row.email,
      bio: row.bio,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rejection_reason: row.rejection_reason,
      rejected_at: row.rejected_at,
      phone_verified: row.phone_verified || false,
      verification_status: row.verification_status || 'unverified',
      national_id_last4: row.national_id_last4,
      verified_at: row.verified_at,
      categories: categoriesResult.rows.map((r) => r.category),
      skills: skillsResult.rows.map((r) => r.skill),
      service_area:
        areaResult.rows.length > 0
          ? {
              center: {
                lat: parseFloat(areaResult.rows[0].center_lat),
                lng: parseFloat(areaResult.rows[0].center_lng)
              },
              radius_km: parseFloat(areaResult.rows[0].radius_km)
            }
          : null
    };

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/taskers/:user_id/verify
 * Approve tasker application (admin only). Sets tasker status to verified and user_verifications.verification_status to verified.
 */
router.post('/taskers/:user_id/verify', requireAdminOnly, async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const profileResult = await pool.query(
      'SELECT status FROM tasker_profiles WHERE user_id = $1',
      [user_id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tasker not found' }
      });
    }

    if (profileResult.rows[0].status !== 'applied') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Only taskers with status applied can be verified'
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE tasker_profiles
         SET status = 'verified', rejection_reason = NULL, rejected_at = NULL, updated_at = now()
         WHERE user_id = $1`,
        [user_id]
      );

      await client.query(
        `INSERT INTO user_verifications (user_id, phone_verified, verification_status, verified_at, updated_at)
         VALUES ($1, true, 'verified', now(), now())
         ON CONFLICT (user_id) DO UPDATE SET
           verification_status = 'verified',
           verified_at = now(),
           updated_at = now()`,
        [user_id]
      );

      await client.query(
        `INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id)
         VALUES (uuid_generate_v4(), $1, 'verify_tasker', 'user', $2)`,
        [req.user.id, user_id]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({
      message: 'Tasker verified successfully',
      user_id,
      status: 'verified'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/taskers/:user_id/reject
 * Reject tasker application (admin only). Stores reason; tasker can resubmit.
 */
router.post('/taskers/:user_id/reject', requireAdminOnly, async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { reason } = z.object({
      reason: z.string().min(1, 'Rejection reason is required')
    }).parse(req.body || {});

    const profileResult = await pool.query(
      'SELECT status FROM tasker_profiles WHERE user_id = $1',
      [user_id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tasker not found' }
      });
    }

    if (profileResult.rows[0].status !== 'applied') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Only taskers with status applied can be rejected'
        }
      });
    }

    await pool.query(
      `UPDATE tasker_profiles
       SET rejection_reason = $1, rejected_at = now(), updated_at = now()
       WHERE user_id = $2`,
      [reason, user_id]
    );

    await pool.query(
      `INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, meta)
       VALUES (uuid_generate_v4(), $1, 'reject_tasker', 'user', $2, $3)`,
      [req.user.id, user_id, JSON.stringify({ reason })]
    );

    res.json({
      message: 'Tasker application rejected',
      user_id,
      rejection_reason: reason
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/disputes/:dispute_id
 * US-A-011: Dispute detail with task, booking, messages, evidence
 */
router.get('/disputes/:dispute_id', async (req, res, next) => {
  try {
    const { dispute_id } = req.params;

    const disputeResult = await pool.query(
      `SELECT d.*, 
              b.task_id, b.tasker_id, b.status as booking_status, b.agreed_rate_amount, b.agreed_rate_currency,
              t.client_id,
              u_client.full_name as client_name, u_client.phone as client_phone,
              u_tasker.full_name as tasker_name, u_tasker.phone as tasker_phone
       FROM disputes d
       JOIN bookings b ON d.booking_id = b.id
       JOIN tasks t ON t.id = b.task_id
       LEFT JOIN users u_client ON u_client.id = t.client_id
       LEFT JOIN users u_tasker ON u_tasker.id = b.tasker_id
       WHERE d.id = $1`,
      [dispute_id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Dispute not found' }
      });
    }

    const row = disputeResult.rows[0];
    const bookingId = row.booking_id;
    const taskId = row.task_id;

    // Get task details
    const taskResult = await pool.query(
      `SELECT t.*, c.full_name as client_name, c.phone as client_phone
       FROM tasks t
       LEFT JOIN users c ON c.id = t.client_id
       WHERE t.id = $1`,
      [taskId]
    );
    const task = taskResult.rows[0] || null;

    // Get messages from conversation (conversation is 1:1 with booking)
    const messagesResult = await pool.query(
      `SELECT m.id, m.sender_id, m.kind, m.text, m.media_url, m.created_at,
              u.full_name as sender_name, u.phone as sender_phone
       FROM conversations c
       JOIN messages m ON m.conversation_id = c.id
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE c.booking_id = $1
       ORDER BY m.created_at ASC`,
      [bookingId]
    );

    // Parse resolution for evidence
    let resolutionData = {};
    try {
      resolutionData = typeof row.resolution === 'string' ? JSON.parse(row.resolution || '{}') : (row.resolution || {});
    } catch (_) {}
    const evidence = resolutionData.evidence || [];
    const resolutionText = resolutionData.resolution || null;
    const refundAmount = resolutionData.refund_amount ?? null;

    res.json({
      dispute: {
        id: row.id,
        booking_id: row.booking_id,
        opened_by: row.opened_by,
        reason: row.reason,
        amount_in_question: row.amount_in_question,
        currency: row.currency,
        status: row.status,
        resolution_text: resolutionText,
        refund_amount: refundAmount,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      booking: {
        id: row.booking_id,
        task_id: row.task_id,
        tasker_id: row.tasker_id,
        client_id: row.client_id,
        status: row.booking_status,
        agreed_rate_amount: row.agreed_rate_amount,
        agreed_rate_currency: row.agreed_rate_currency,
        client_name: row.client_name || row.client_phone,
        tasker_name: row.tasker_name || row.tasker_phone
      },
      task,
      messages: messagesResult.rows.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_name || m.sender_phone || 'Unknown',
        kind: m.kind,
        text: m.text,
        media_url: m.media_url,
        created_at: m.created_at
      })),
      evidence
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/disputes
 * List all disputes
 */
router.get('/disputes', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { status } = req.query;

    let query = 'SELECT * FROM disputes WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM disputes WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const disputes = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? disputes[disputes.length - 1].id : null;

    res.json(formatPaginatedResponse(disputes, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/disputes/:dispute_id/resolve
 * Resolve dispute. US-A-013: Wire refund_amount to ledger when provided.
 */
router.post('/disputes/:dispute_id/resolve', async (req, res, next) => {
  try {
    const { dispute_id } = req.params;
    const { resolution, refund_amount } = z.object({
      resolution: z.string(),
      refund_amount: z.number().optional()
    }).parse(req.body);

    const disputeResult = await pool.query(
      `SELECT d.*, b.task_id, b.tasker_id, b.agreed_rate_currency, t.client_id
       FROM disputes d
       JOIN bookings b ON d.booking_id = b.id
       JOIN tasks t ON t.id = b.task_id
       WHERE d.id = $1`,
      [dispute_id]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dispute not found'
        }
      });
    }

    const dispute = disputeResult.rows[0];
    const clientId = dispute.client_id;
    const currency = dispute.agreed_rate_currency || 'EGP';
    const refundAmountCents = refund_amount != null ? Math.round(refund_amount * 100) : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Merge new resolution with existing evidence (preserve evidence added before resolve)
      let currentResolution = {};
      try {
        currentResolution = typeof dispute.resolution === 'string'
          ? JSON.parse(dispute.resolution || '{}')
          : (dispute.resolution || {});
      } catch (_) {}
      const mergedResolution = {
        ...currentResolution,
        resolution,
        refund_amount: refund_amount ?? null
      };

      await client.query(
        `UPDATE disputes 
         SET status = 'resolved', 
             resolution = $1,
             updated_at = now()
         WHERE id = $2`,
        [JSON.stringify(mergedResolution), dispute_id]
      );

      await client.query(
        `UPDATE bookings SET status = 'completed', updated_at = now()
         WHERE id = $1 AND status = 'disputed'`,
        [dispute.booking_id]
      );

      // US-A-013: Create ledger entry for refund when refund_amount > 0
      // Uses existing ledger accounts (created by payment flow); skips if accounts don't exist yet
      if (refundAmountCents != null && refundAmountCents > 0) {
        const [clientAcc, escrowAcc] = await Promise.all([
          client.query(
            `SELECT id FROM ledger_accounts WHERE kind = 'client_wallet' AND owner_user_id = $1 AND currency = $2`,
            [clientId, currency]
          ),
          client.query(
            `SELECT id FROM ledger_accounts WHERE kind = 'escrow' AND owner_user_id IS NULL AND currency = $1 LIMIT 1`,
            [currency]
          )
        ]);
        const clientAccountId = clientAcc.rows[0]?.id;
        const escrowAccountId = escrowAcc.rows[0]?.id;
        if (clientAccountId && escrowAccountId) {
          const entryId = uuidv4();
          await client.query(
            `INSERT INTO ledger_entries (id, entry_type, booking_id, reference_id, currency) 
             VALUES ($1, 'refund', $2, $3, $4)`,
            [entryId, dispute.booking_id, `dispute-${dispute_id}`, currency]
          );
          await client.query(
            `INSERT INTO ledger_lines (entry_id, account_id, amount) VALUES ($1, $2, $3), ($1, $4, $5)`,
            [entryId, escrowAccountId, -refundAmountCents, clientAccountId, refundAmountCents]
          );
        }
      }

      await client.query(
        `INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, meta)
         VALUES (uuid_generate_v4(), $1, 'resolve_dispute', 'dispute', $2, $3)`,
        [req.user.id, dispute_id, JSON.stringify({ resolution, refund_amount: refund_amount ?? null })]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({
      message: 'Dispute resolved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/metrics
 * US-A-018: Marketplace metrics. US-A-019: ?by=city for city-level. US-A-004: fill_rate, time_to_accept_avg.
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const { start_date, end_date, by: groupBy } = req.query;
    const dateFilter = start_date && end_date ? ' AND created_at BETWEEN $1 AND $2' : '';
    const dateParams = start_date && end_date ? [start_date, end_date] : [];

    // US-A-004: Calculate average time-to-accept (from task creation to first booking acceptance)
    // We join tasks with their first accepted booking and calculate the time difference
    const timeToAcceptQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (b.created_at - t.created_at))) as avg_seconds,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (b.created_at - t.created_at))) as median_seconds,
        MIN(EXTRACT(EPOCH FROM (b.created_at - t.created_at))) as min_seconds,
        MAX(EXTRACT(EPOCH FROM (b.created_at - t.created_at))) as max_seconds,
        COUNT(*)::int as sample_count
      FROM tasks t
      INNER JOIN LATERAL (
        SELECT created_at 
        FROM bookings 
        WHERE task_id = t.id AND status IN ('accepted', 'confirmed', 'in_progress', 'completed')
        ORDER BY created_at ASC
        LIMIT 1
      ) b ON true
      WHERE t.state IN ('accepted', 'confirmed', 'in_progress', 'completed', 'settled', 'reviewed')
      ${dateFilter ? dateFilter.replace('created_at', 't.created_at') : ''}
    `;

    const [tasks, bookings, users, revenue, timeToAccept] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as count, state FROM tasks WHERE 1=1 ${dateFilter} GROUP BY state`, dateParams),
      pool.query(`SELECT COUNT(*)::int as count, status FROM bookings WHERE 1=1 ${dateFilter} GROUP BY status`, dateParams),
      pool.query(`SELECT COUNT(*)::int as count, role FROM users WHERE 1=1 ${dateFilter} GROUP BY role`, dateParams),
      pool.query(`SELECT COALESCE(SUM(agreed_rate_amount), 0)::bigint as total FROM bookings WHERE status = 'completed' ${dateFilter}`, dateParams),
      pool.query(timeToAcceptQuery, dateParams)
    ]);

    const totalTasks = tasks.rows.reduce((s, r) => s + Number(r.count), 0);
    const completedLike = ['completed', 'settled', 'reviewed'];
    const completedCount = tasks.rows
      .filter(r => completedLike.includes(r.state))
      .reduce((s, r) => s + Number(r.count), 0);
    const fillRate = totalTasks > 0 ? (completedCount / totalTasks) : null;

    // Format time-to-accept metrics (convert seconds to minutes for readability)
    const ttaRow = timeToAccept.rows[0];
    const timeToAcceptMetrics = ttaRow && ttaRow.sample_count > 0 ? {
      avg_minutes: ttaRow.avg_seconds ? Math.round(parseFloat(ttaRow.avg_seconds) / 60 * 10) / 10 : null,
      median_minutes: ttaRow.median_seconds ? Math.round(parseFloat(ttaRow.median_seconds) / 60 * 10) / 10 : null,
      min_minutes: ttaRow.min_seconds ? Math.round(parseFloat(ttaRow.min_seconds) / 60 * 10) / 10 : null,
      max_minutes: ttaRow.max_seconds ? Math.round(parseFloat(ttaRow.max_seconds) / 60 * 10) / 10 : null,
      sample_count: ttaRow.sample_count
    } : null;

    let byCity = null;
    if (groupBy === 'city') {
      const cityResult = await pool.query(
        `SELECT city, COUNT(*)::int as task_count FROM tasks WHERE 1=1 ${dateFilter} GROUP BY city ORDER BY task_count DESC`,
        dateParams
      );
      byCity = cityResult.rows;
    }

    // US-A-020: 30-day retention - % of users from prior 30-day window who returned in last 30 days
    const [clientRetentionResult, taskerRetentionResult] = await Promise.all([
      pool.query(`
        WITH prior_clients AS (
          SELECT DISTINCT t.client_id
          FROM bookings b
          JOIN tasks t ON t.id = b.task_id
          WHERE b.status = 'completed'
            AND b.created_at >= now() - interval '60 days'
            AND b.created_at < now() - interval '30 days'
        ),
        recent_clients AS (
          SELECT DISTINCT t.client_id
          FROM bookings b
          JOIN tasks t ON t.id = b.task_id
          WHERE b.status = 'completed'
            AND b.created_at >= now() - interval '30 days'
        )
        SELECT 
          (SELECT COUNT(*)::int FROM prior_clients) as prior_count,
          (SELECT COUNT(*)::int FROM recent_clients) as recent_count,
          (SELECT COUNT(*)::int FROM prior_clients pc WHERE EXISTS (SELECT 1 FROM recent_clients rc WHERE rc.client_id = pc.client_id)) as retained_count
      `),
      pool.query(`
        WITH prior_taskers AS (
          SELECT DISTINCT tasker_id
          FROM bookings
          WHERE status = 'completed'
            AND created_at >= now() - interval '60 days'
            AND created_at < now() - interval '30 days'
        ),
        recent_taskers AS (
          SELECT DISTINCT tasker_id
          FROM bookings
          WHERE status = 'completed'
            AND created_at >= now() - interval '30 days'
        )
        SELECT 
          (SELECT COUNT(*)::int FROM prior_taskers) as prior_count,
          (SELECT COUNT(*)::int FROM recent_taskers) as recent_count,
          (SELECT COUNT(*)::int FROM prior_taskers pt WHERE EXISTS (SELECT 1 FROM recent_taskers rt WHERE rt.tasker_id = pt.tasker_id)) as retained_count
      `)
    ]);
    const clientRet = clientRetentionResult.rows[0];
    const taskerRet = taskerRetentionResult.rows[0];
    const retention_30d = {
      client: {
        prior_count: clientRet?.prior_count || 0,
        retained_count: clientRet?.retained_count || 0,
        retention_rate: clientRet?.prior_count > 0
          ? Math.round((clientRet.retained_count / clientRet.prior_count) * 1000) / 10
          : null
      },
      tasker: {
        prior_count: taskerRet?.prior_count || 0,
        retained_count: taskerRet?.retained_count || 0,
        retention_rate: taskerRet?.prior_count > 0
          ? Math.round((taskerRet.retained_count / taskerRet.prior_count) * 1000) / 10
          : null
      }
    };

    const out = {
      tasks: tasks.rows,
      bookings: bookings.rows,
      users: users.rows,
      revenue: { total: parseInt(revenue.rows[0]?.total || 0, 10), currency: 'EGP' },
      fill_rate: fillRate,
      time_to_accept: timeToAcceptMetrics,
      retention_30d,
      by_city: byCity
    };
    res.json(out);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/audit-log
 * US-A-033: Audit log of admin actions (who, what, when)
 */
router.get('/audit-log', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { action, target_type, actor_user_id } = req.query;
    let query = `
      SELECT al.id, al.actor_user_id, al.action, al.target_type, al.target_id, al.meta, al.created_at,
             u.phone as actor_phone, u.full_name as actor_name
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    if (action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }
    if (target_type) {
      query += ` AND al.target_type = $${paramIndex++}`;
      params.push(target_type);
    }
    if (actor_user_id) {
      query += ` AND al.actor_user_id = $${paramIndex++}`;
      params.push(actor_user_id);
    }
    if (cursor) {
      query += ` AND al.created_at < (SELECT created_at FROM audit_log WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);
    const result = await pool.query(query, params);
    const items = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? items[items.length - 1].id : null;
    res.json(formatPaginatedResponse(items, nextCursor));
  } catch (error) {
    next(error);
  }
});

export default router;
