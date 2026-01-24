import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
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
 * List all tasks
 */
router.get('/tasks', pagination, async (req, res, next) => {
  try {
    const { limit, cursor } = req.pagination;
    const { state, city } = req.query;

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
 * Suspend user
 */
router.post('/users/:user_id/suspend', async (req, res, next) => {
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
 * Unsuspend user
 */
router.post('/users/:user_id/unsuspend', async (req, res, next) => {
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
 * Get platform metrics
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const dateFilter = start_date && end_date 
      ? `WHERE created_at BETWEEN '${start_date}' AND '${end_date}'`
      : '';

    const [tasks, bookings, users, revenue] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count, state FROM tasks ${dateFilter} GROUP BY state`),
      pool.query(`SELECT COUNT(*) as count, status FROM bookings ${dateFilter} GROUP BY status`),
      pool.query(`SELECT COUNT(*) as count, role FROM users ${dateFilter} GROUP BY role`),
      pool.query(`
        SELECT COALESCE(SUM(agreed_rate_amount), 0) as total
        FROM bookings 
        WHERE status = 'completed' ${dateFilter ? `AND created_at BETWEEN '${start_date}' AND '${end_date}'` : ''}
      `)
    ]);

    res.json({
      tasks: tasks.rows,
      bookings: bookings.rows,
      users: users.rows,
      revenue: {
        total: parseInt(revenue.rows[0].total),
        currency: 'EGP'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
