import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole, optionalAuth } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import TaskService from '../../services/task/index.js';

const router = express.Router();

/**
 * POST /api/v1/tasks
 * Create a task
 */
router.post('/', authenticate, requireRole('client'), idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, subcategory, description, location, schedule, structured_inputs } = z.object({
      category: z.string(),
      subcategory: z.string().optional(),
      description: z.string(),
      location: z.object({
        address: z.string(),
        point: z.object({
          lat: z.number(),
          lng: z.number()
        }),
        city: z.string(),
        district: z.string().optional()
      }),
      schedule: z.object({
        starts_at: z.string().datetime(),
        flexibility_minutes: z.number().default(0)
      }),
      structured_inputs: z.record(z.any()).optional()
    }).parse(req.body);

    const taskId = uuidv4();
    const result = await pool.query(
      `INSERT INTO tasks (
        id, client_id, category, subcategory, description,
        address, city, district, lat, lng,
        starts_at, flexibility_minutes, structured_inputs, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
      RETURNING *`,
      [
        taskId, userId, category, subcategory || null, description,
        location.address, location.city, location.district || null,
        location.point.lat, location.point.lng,
        schedule.starts_at, schedule.flexibility_minutes || 0,
        JSON.stringify(structured_inputs || {}), 'draft'
      ]
    );

    const task = result.rows[0];

    // Log state event
    await pool.query(
      `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
       VALUES (uuid_generate_v4(), $1, NULL, 'draft', $2)`,
      [taskId, userId]
    );

    res.status(201).json({
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
      state: task.state,
      created_at: task.created_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tasks
 * List tasks (for client)
 */
router.get('/', authenticate, requireRole('client'), pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;
    const { state } = req.query;

    let query = 'SELECT * FROM tasks WHERE client_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (state) {
      query += ` AND state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM tasks WHERE id = $${paramIndex})`;
      params.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const tasks = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? tasks[tasks.length - 1].id : null;

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
      state: task.state,
      created_at: task.created_at
    }));

    res.json(formatPaginatedResponse(formattedTasks, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tasks/:task_id
 * Get task
 */
router.get('/:task_id', authenticate, optionalAuth, async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = req.user?.id;

    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [task_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    const task = result.rows[0];

    // Check authorization
    if (task.client_id !== userId && req.user?.role !== 'admin' && req.user?.role !== 'ops') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    res.json({
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
      structured_inputs: task.structured_inputs,
      state: task.state,
      created_at: task.created_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/tasks/:task_id
 * Update task (before acceptance)
 */
router.patch('/:task_id', authenticate, requireRole('client'), async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.id;
    const { description, schedule, structured_inputs } = z.object({
      description: z.string().optional(),
      schedule: z.object({
        starts_at: z.string().datetime(),
        flexibility_minutes: z.number()
      }).optional(),
      structured_inputs: z.record(z.any()).optional()
    }).parse(req.body);

    // Check task exists and belongs to user
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

    // Can only update if in draft or posted state
    if (!['draft', 'posted'].includes(task.state)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Task cannot be updated in current state'
        }
      });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }

    if (schedule !== undefined) {
      updates.push(`starts_at = $${paramIndex++}`);
      params.push(schedule.starts_at);
      if (schedule.flexibility_minutes !== undefined) {
        updates.push(`flexibility_minutes = $${paramIndex++}`);
        params.push(schedule.flexibility_minutes);
      }
    }

    if (structured_inputs !== undefined) {
      updates.push(`structured_inputs = $${paramIndex++}`);
      params.push(JSON.stringify(structured_inputs));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No fields to update'
        }
      });
    }

    updates.push(`updated_at = now()`);
    params.push(task_id);

    await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    // Get updated task
    const updatedResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [task_id]);

    res.json({
      id: updatedResult.rows[0].id,
      client_id: updatedResult.rows[0].client_id,
      category: updatedResult.rows[0].category,
      description: updatedResult.rows[0].description,
      state: updatedResult.rows[0].state,
      updated_at: updatedResult.rows[0].updated_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/tasks/:task_id/post
 * Post task to marketplace
 */
router.post('/:task_id/post', authenticate, requireRole('client'), async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.id;

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

    if (task.state !== 'draft') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Task must be in draft state to post'
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update state to posted
      await client.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        ['posted', task_id]
      );

      // Log state event
      await client.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
         VALUES (uuid_generate_v4(), $1, 'draft', 'posted', $2)`,
        [task_id, userId]
      );

      // TODO: Trigger matching service to find candidates
      // This would be done via event or service call

      await client.query('COMMIT');

      const updatedResult = await client.query('SELECT * FROM tasks WHERE id = $1', [task_id]);

      res.json({
        id: updatedResult.rows[0].id,
        state: updatedResult.rows[0].state,
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
 * POST /api/v1/tasks/:task_id/cancel
 * Cancel task
 */
router.post('/:task_id/cancel', authenticate, requireRole('client'), async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

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

    // Can only cancel if not completed or settled
    if (['completed', 'settled', 'reviewed'].includes(task.state)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Cannot cancel task in current state'
        }
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

      // Log state event
      await client.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id, reason)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
        [task_id, task.state, newState, userId, reason || null]
      );

      // Cancel any active booking
      await client.query(
        `UPDATE bookings SET status = 'canceled', updated_at = now()
         WHERE task_id = $1 AND status NOT IN ('completed', 'canceled', 'disputed')`,
        [task_id]
      );

      await client.query('COMMIT');

      res.json({
        id: task_id,
        state: newState,
        message: 'Task canceled successfully'
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
 * POST /api/v1/tasks/:task_id/accept
 * Accept task (for tasker)
 */
router.post('/:task_id/accept', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const taskerId = req.user.id;

    // Check if tasker is in candidates
    const candidateResult = await pool.query(
      'SELECT * FROM task_candidates WHERE task_id = $1 AND tasker_id = $2',
      [task_id, taskerId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(403).json({
        error: {
          code: 'NOT_OFFERED',
          message: 'Task not offered to this tasker'
        }
      });
    }

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

    if (task.state !== 'matching') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Task is not in matching state'
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create booking
      const bookingId = uuidv4();
      await client.query(
        `INSERT INTO bookings (id, task_id, tasker_id, status)
         VALUES ($1, $2, $3, 'offered')`,
        [bookingId, task_id, taskerId]
      );

      // Update task state
      await client.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        ['accepted', task_id]
      );

      // Log events
      await client.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
         VALUES (uuid_generate_v4(), $1, 'matching', 'accepted', $2)`,
        [task_id, taskerId]
      );

      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id)
         VALUES (uuid_generate_v4(), $1, NULL, 'offered', $2)`,
        [bookingId, taskerId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        booking_id: bookingId,
        task_id: task_id,
        status: 'offered',
        message: 'Task accepted successfully'
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
 * POST /api/v1/tasks/:task_id/decline
 * Decline task (for tasker)
 */
router.post('/:task_id/decline', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const taskerId = req.user.id;

    // Remove from candidates
    await pool.query(
      'DELETE FROM task_candidates WHERE task_id = $1 AND tasker_id = $2',
      [task_id, taskerId]
    );

    res.json({
      message: 'Task declined successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/tasks/:task_id/candidates
 * Get ranked Tasker candidates for a task
 */
router.get('/:task_id/candidates', authenticate, requireRole('client'), pagination, async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.id;
    const { limit } = req.pagination;

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

    // Get candidates
    const result = await pool.query(
      `SELECT tc.*, tp.rating_avg, tp.rating_count, u.full_name
       FROM task_candidates tc
       JOIN tasker_profiles tp ON tc.tasker_id = tp.user_id
       JOIN users u ON tc.tasker_id = u.id
       WHERE tc.task_id = $1
       ORDER BY tc.rank ASC
       LIMIT $2`,
      [task_id, limit]
    );

    const items = result.rows.map(row => ({
      tasker: {
        user_id: row.tasker_id,
        full_name: row.full_name,
        rating: {
          average: parseFloat(row.rating_avg),
          count: row.rating_count
        }
      },
      score_explanation: row.explanation,
      rank: row.rank,
      score: parseFloat(row.score)
    }));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export default router;
