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
 * List all tasks. US-A-001, US-A-002: ?unfilled_minutes=N shows tasks posted/matching for ≥N minutes with no accept.
 */
router.get('/tasks', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { state, city, unfilled_minutes } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (state) {
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
 * Resolve dispute
 */
router.post('/disputes/:dispute_id/resolve', async (req, res, next) => {
  try {
    const { dispute_id } = req.params;
    const { resolution, refund_amount } = z.object({
      resolution: z.string(),
      refund_amount: z.number().optional()
    }).parse(req.body);

    const disputeResult = await pool.query('SELECT * FROM disputes WHERE id = $1', [dispute_id]);

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dispute not found'
        }
      });
    }

    const dispute = disputeResult.rows[0];

    await pool.query(
      `UPDATE disputes 
       SET status = 'resolved', 
           resolution = $1,
           updated_at = now()
       WHERE id = $2`,
      [JSON.stringify({ resolution, refund_amount: refund_amount || null }), dispute_id]
    );

    // Update booking status
    await pool.query(
      `UPDATE bookings SET status = 'completed', updated_at = now()
       WHERE id = $1 AND status = 'disputed'`,
      [dispute.booking_id]
    );

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

    const [tasks, bookings, users, revenue] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as count, state FROM tasks WHERE 1=1 ${dateFilter} GROUP BY state`, dateParams),
      pool.query(`SELECT COUNT(*)::int as count, status FROM bookings WHERE 1=1 ${dateFilter} GROUP BY status`, dateParams),
      pool.query(`SELECT COUNT(*)::int as count, role FROM users WHERE 1=1 ${dateFilter} GROUP BY role`, dateParams),
      pool.query(`SELECT COALESCE(SUM(agreed_rate_amount), 0)::bigint as total FROM bookings WHERE status = 'completed' ${dateFilter}`, dateParams)
    ]);

    const totalTasks = tasks.rows.reduce((s, r) => s + Number(r.count), 0);
    const completedLike = ['completed', 'settled', 'reviewed'];
    const completedCount = tasks.rows
      .filter(r => completedLike.includes(r.state))
      .reduce((s, r) => s + Number(r.count), 0);
    const fillRate = totalTasks > 0 ? (completedCount / totalTasks) : null;

    let byCity = null;
    if (groupBy === 'city') {
      const cityResult = await pool.query(
        `SELECT city, COUNT(*)::int as task_count FROM tasks WHERE 1=1 ${dateFilter} GROUP BY city ORDER BY task_count DESC`,
        dateParams
      );
      byCity = cityResult.rows;
    }

    const out = {
      tasks: tasks.rows,
      bookings: bookings.rows,
      users: users.rows,
      revenue: { total: parseInt(revenue.rows[0]?.total || 0, 10), currency: 'EGP' },
      fill_rate: fillRate,
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
