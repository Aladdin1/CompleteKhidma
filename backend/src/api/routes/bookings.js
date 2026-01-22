import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/v1/bookings
 * List bookings (for taskers to see their accepted tasks)
 * Per user story US-T-022 to US-T-027: Taskers need to see and manage their accepted tasks
 */
router.get('/', authenticate, requireRole('tasker'), pagination, async (req, res, next) => {
  try {
    const taskerId = req.user.id;
    const { limit, cursor } = req.pagination;
    const { status } = req.query; // Optional filter by status

    let query = `
      SELECT 
        b.*,
        t.id as task_id,
        t.client_id,
        t.category,
        t.description,
        t.address,
        t.city,
        t.lat,
        t.lng,
        t.starts_at,
        t.state as task_state
      FROM bookings b
      JOIN tasks t ON b.task_id = t.id
      WHERE b.tasker_id = $1
    `;

    const params = [taskerId];
    let paramIndex = 2;

    // Filter by status if provided
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Exclude canceled and disputed bookings by default (unless specifically requested)
    if (!status || (status !== 'canceled' && status !== 'disputed')) {
      query += ` AND b.status NOT IN ('canceled', 'disputed')`;
    }

    // Cursor-based pagination
    if (cursor) {
      query += ` AND b.created_at < (SELECT created_at FROM bookings WHERE id = $${paramIndex})`;
      params.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const bookings = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? bookings[bookings.length - 1].id : null;

    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      task: {
        id: booking.task_id,
        client_id: booking.client_id,
        category: booking.category,
        description: booking.description,
        location: {
          address: booking.address,
          city: booking.city,
          point: {
            lat: booking.lat,
            lng: booking.lng
          }
        },
        schedule: {
          starts_at: booking.starts_at
        },
        state: booking.task_state
      },
      status: booking.status,
      agreed_rate: {
        currency: booking.agreed_rate_currency,
        amount: booking.agreed_rate_amount
      },
      agreed_minimum_minutes: booking.agreed_minimum_minutes,
      started_at: booking.started_at,
      completed_at: booking.completed_at,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    }));

    res.json(formatPaginatedResponse(formattedBookings, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/bookings
 * Create booking (select Tasker)
 */
router.post('/', authenticate, requireRole('client'), idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { task_id, tasker_id, proposed_rate, minimum_minutes } = z.object({
      task_id: z.string().uuid(),
      tasker_id: z.string().uuid(),
      proposed_rate: z.object({
        currency: z.string(),
        amount: z.number()
      }).nullish(),
      minimum_minutes: z.number().nullish()
    }).parse(req.body);

    // Verify task belongs to user
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND client_id = $2',
      [task_id, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    const task = taskResult.rows[0];

    if (!['draft', 'posted', 'matching'].includes(task.state)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Task cannot be booked in current state'
        }
      });
    }

    // Check if booking already exists
    const existingBooking = await pool.query(
      'SELECT * FROM bookings WHERE task_id = $1',
      [task_id]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'BOOKING_EXISTS',
          message: 'Booking already exists for this task'
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bookingId = uuidv4();
      await client.query(
        `INSERT INTO bookings (
          id, task_id, tasker_id, status,
          agreed_rate_amount, agreed_rate_currency, agreed_minimum_minutes
        ) VALUES ($1, $2, $3, 'offered', $4, $5, $6)`,
        [
          bookingId,
          task_id,
          tasker_id,
          proposed_rate?.amount || null,
          proposed_rate?.currency || task.currency || 'EGP',
          minimum_minutes || 60
        ]
      );

      // Update task state
      await client.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        ['accepted', task_id]
      );

      // Log events
      await client.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
         VALUES (uuid_generate_v4(), $1, $2, 'accepted', $3)`,
        [task_id, task.state, userId]
      );

      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id)
         VALUES (uuid_generate_v4(), $1, NULL, 'offered', $2)`,
        [bookingId, userId]
      );

      await client.query('COMMIT');

      const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);

      res.status(201).json({
        id: bookingResult.rows[0].id,
        task_id: bookingResult.rows[0].task_id,
        tasker_id: bookingResult.rows[0].tasker_id,
        status: bookingResult.rows[0].status,
        agreed_rate: {
          currency: bookingResult.rows[0].agreed_rate_currency,
          amount: bookingResult.rows[0].agreed_rate_amount
        },
        agreed_minimum_minutes: bookingResult.rows[0].agreed_minimum_minutes,
        created_at: bookingResult.rows[0].created_at
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
 * GET /api/v1/bookings/:booking_id
 * Get booking
 */
router.get('/:booking_id', authenticate, async (req, res, next) => {
  try {
    const { booking_id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT b.*, t.client_id, t.category, t.description
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)`,
      [booking_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        }
      });
    }

    const booking = result.rows[0];

    res.json({
      id: booking.id,
      task_id: booking.task_id,
      tasker_id: booking.tasker_id,
      status: booking.status,
      agreed_rate: {
        currency: booking.agreed_rate_currency,
        amount: booking.agreed_rate_amount
      },
      agreed_minimum_minutes: booking.agreed_minimum_minutes,
      started_at: booking.started_at,
      completed_at: booking.completed_at,
      created_at: booking.created_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/bookings/:booking_id/status
 * Update booking status
 */
router.post('/:booking_id/status', authenticate, async (req, res, next) => {
  try {
    const { booking_id } = req.params;
    const userId = req.user.id;
    const { status, meta } = z.object({
      status: z.enum(['accepted', 'confirmed', 'in_progress', 'completed', 'canceled', 'disputed']),
      meta: z.record(z.any()).optional()
    }).parse(req.body);

    // Get booking
    const bookingResult = await pool.query(
      `SELECT b.*, t.client_id
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        }
      });
    }

    const booking = bookingResult.rows[0];

    // Verify authorization
    const isClient = booking.client_id === userId;
    const isTasker = booking.tasker_id === userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ops';

    if (!isClient && !isTasker && !isAdmin) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    // Validate state transitions
    const validTransitions = {
      'offered': ['accepted', 'canceled'],
      'accepted': ['confirmed', 'canceled'],
      'confirmed': ['in_progress', 'canceled'],
      'in_progress': ['completed', 'disputed'],
      'completed': ['disputed'],
      'canceled': [],
      'disputed': []
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition from ${booking.status} to ${status}`
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updates = ['status = $1', 'updated_at = now()'];
      const params = [status];
      let paramIndex = 2;

      if (status === 'in_progress' && !booking.started_at) {
        updates.push('started_at = now()');
      }

      if (status === 'completed' && !booking.completed_at) {
        updates.push('completed_at = now()');
      }

      params.push(booking_id);

      await client.query(
        `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      // Update task state if needed
      if (status === 'in_progress') {
        await client.query(
          'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
          ['in_progress', booking.task_id]
        );
      } else if (status === 'completed') {
        await client.query(
          'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
          ['completed', booking.task_id]
        );
      } else if (status === 'disputed') {
        await client.query(
          'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
          ['disputed', booking.task_id]
        );
      }

      // Log event
      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id, meta)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
        [booking_id, booking.status, status, userId, JSON.stringify(meta || {})]
      );

      await client.query('COMMIT');

      const updatedResult = await client.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);

      res.json({
        id: updatedResult.rows[0].id,
        status: updatedResult.rows[0].status,
        updated_at: updatedResult.rows[0].updated_at
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
 * POST /api/v1/bookings/:booking_id/cancel
 * Cancel booking
 */
router.post('/:booking_id/cancel', authenticate, async (req, res, next) => {
  try {
    const { booking_id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const bookingResult = await pool.query(
      `SELECT b.*, t.client_id
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        }
      });
    }

    const booking = bookingResult.rows[0];

    // Verify authorization
    const isClient = booking.client_id === userId;
    const isTasker = booking.tasker_id === userId;

    if (!isClient && !isTasker) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    if (['completed', 'canceled', 'disputed'].includes(booking.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Cannot cancel booking in current state'
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2',
        ['canceled', booking_id]
      );

      // Update task state
      const canceledBy = isClient ? 'canceled_by_client' : 'canceled_by_tasker';
      await client.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        [canceledBy, booking.task_id]
      );

      // Log events
      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id)
         VALUES (uuid_generate_v4(), $1, $2, 'canceled', $3)`,
        [booking_id, booking.status, userId]
      );

      await client.query('COMMIT');

      res.json({
        id: booking_id,
        status: 'canceled',
        message: 'Booking canceled successfully'
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

export default router;
