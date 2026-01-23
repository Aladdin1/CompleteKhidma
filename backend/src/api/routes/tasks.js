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
        district: z.string().nullish()
      }),
      schedule: z.object({
        starts_at: z.string().datetime(),
        flexibility_minutes: z.number().default(0)
      }),
      structured_inputs: z.record(z.any()).optional()
    }).parse(req.body);

    // Check database connection
    let dbAvailable = false;
    try {
      await pool.query('SELECT NOW()');
      dbAvailable = true;
    } catch (dbCheckError) {
      // Database not available
      dbAvailable = false;
    }

    if (!dbAvailable) {
      return res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database service is not available. Task creation requires PostgreSQL to be running.',
          details: {
            hint: 'Please start PostgreSQL and restart the backend server.',
            alternative: 'For development, you can use Docker: docker-compose up -d postgres'
          }
        }
      });
    }

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
        JSON.stringify(structured_inputs || {})
        // Note: 'draft' is hardcoded in VALUES clause, not in parameters
      ]
    );

    const task = result.rows[0];

    // Log state event
    try {
      await pool.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
         VALUES (uuid_generate_v4(), $1, NULL, 'draft', $2)`,
        [taskId, userId]
      );
    } catch (eventError) {
      // Log error but don't fail the request if event logging fails
      console.warn('Failed to log task state event:', eventError.message);
    }

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
    // Log detailed error for debugging
    console.error('Task creation error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      body: req.body
    });
    
    // Handle database connection errors more gracefully
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('connect')) {
      return res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database connection failed. Please ensure PostgreSQL is running.',
          details: {
            hint: 'Start PostgreSQL with: docker-compose up -d postgres',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          }
        }
      });
    }
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

    // Validate task_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(task_id)) {
      console.error(`Invalid task_id in GET /tasks/:task_id: "${task_id}"`);
      return res.status(400).json({
        error: {
          code: 'INVALID_UUID',
          message: `Invalid task ID format: "${task_id}". Expected a valid UUID.`
        }
      });
    }

    // Validate userId if provided (should always be a UUID if user is authenticated)
    if (userId && !uuidRegex.test(userId)) {
      console.error(`Invalid userId in GET /tasks/:task_id: "${userId}", task_id: "${task_id}", user object:`, req.user);
      return res.status(400).json({
        error: {
          code: 'INVALID_USER_ID',
          message: `Invalid user ID format: "${userId}". Expected a valid UUID. This suggests the authentication token has an invalid user ID.`
        }
      });
    }

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
    // Allow access if:
    // 1. User is the task owner (client)
    // 2. User is admin or ops
    // 3. User is a tasker AND (task is in posted/matching state OR tasker has a booking for this task)
    const isOwner = task.client_id === userId;
    const isAdminOrOps = req.user?.role === 'admin' || req.user?.role === 'ops';
    
    let isTaskerAuthorized = false;
    if (req.user?.role === 'tasker' && userId) {
      // Check if task is available for viewing (posted/matching) OR tasker has a booking
      if (task.state === 'posted' || task.state === 'matching') {
        isTaskerAuthorized = true;
      } else {
        // Check if tasker has a booking for this task
        const bookingResult = await pool.query(
          'SELECT id FROM bookings WHERE task_id = $1 AND tasker_id = $2 LIMIT 1',
          [task_id, userId]
        );
        isTaskerAuthorized = bookingResult.rows.length > 0;
      }
    }
    
    if (!isOwner && !isAdminOrOps && !isTaskerAuthorized) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    // Get assigned tasker information if task is accepted or in progress
    let assignedTasker = null;
    if (['accepted', 'confirmed', 'in_progress', 'completed'].includes(task.state)) {
      try {
        const bookingResult = await pool.query(
          `SELECT 
            b.id as booking_id,
            b.tasker_id,
            b.status as booking_status,
            b.agreed_rate_amount,
            b.agreed_rate_currency,
            b.started_at,
            b.completed_at,
            u.full_name,
            u.phone,
            tp.bio,
            tp.rating_avg,
            tp.rating_count,
            tp.acceptance_rate,
            tp.completion_rate,
            uv.verification_status,
            uv.verified_at
           FROM bookings b
           JOIN users u ON b.tasker_id = u.id
           LEFT JOIN tasker_profiles tp ON b.tasker_id = tp.user_id
           LEFT JOIN user_verifications uv ON b.tasker_id = uv.user_id
           WHERE b.task_id = $1 AND b.status NOT IN ('canceled', 'disputed')
           ORDER BY b.created_at DESC
         LIMIT 1`,
          [task_id]
        );

        if (bookingResult.rows.length > 0) {
          const booking = bookingResult.rows[0];
          
          // Get tasker skills and categories
          const [skillsResult, categoriesResult] = await Promise.all([
            pool.query('SELECT skill FROM tasker_skills WHERE tasker_id = $1', [booking.tasker_id]),
            pool.query('SELECT category FROM tasker_categories WHERE tasker_id = $1', [booking.tasker_id])
          ]);

          assignedTasker = {
            user_id: booking.tasker_id,
            full_name: booking.full_name,
            phone: booking.phone,
            bio: booking.bio,
            booking_id: booking.booking_id,
            booking_status: booking.booking_status,
            rating: {
              average: parseFloat(booking.rating_avg) || 0,
              count: booking.rating_count || 0
            },
            skills: skillsResult.rows.map(r => r.skill),
            categories: categoriesResult.rows.map(r => r.category),
            verification: {
              status: booking.verification_status || 'unverified',
              verified_at: booking.verified_at,
              is_verified: booking.verification_status === 'verified'
            },
            stats: {
              acceptance_rate: parseFloat(booking.acceptance_rate) || 0,
              completion_rate: parseFloat(booking.completion_rate) || 0
            }
          };
        }
      } catch (bookingError) {
          // Catch UUID errors in booking query
          if (bookingError.message && bookingError.message.includes('invalid input syntax for type uuid')) {
            console.error('UUID validation error in booking query:', {
              task_id,
              error: bookingError.message
            });
            // Don't fail the whole request, just skip assigned tasker
            assignedTasker = null;
          } else {
            throw bookingError; // Re-throw other errors
          }
      }
    }

    const response = {
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
    };

    // Add assigned tasker if available
    if (assignedTasker) {
      response.assigned_tasker = assignedTasker;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/tasks/:task_id
 * Update task (before acceptance)
 * Only the task owner (client) can edit tasks - taskers cannot edit posted tasks
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

    // Check task exists and belongs to user (task owner only - taskers cannot edit)
    // Note: Even though requireRole('client') allows taskers due to middleware,
    // this ownership check ensures only the task owner can edit
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
 * 
 * Allows taskers to accept tasks that are in 'posted' or 'matching' state.
 * Per user story US-T-015: "As a tasker, I want to accept or decline task offers"
 * 
 * Note: The matching service (to populate task_candidates) is not yet implemented,
 * so we allow direct acceptance from available tasks rather than requiring
 * the tasker to be in the candidates list first.
 */
router.post('/:task_id/accept', authenticate, requireRole('tasker'), async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const taskerId = req.user.id;

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

    // Allow accepting tasks in 'posted' or 'matching' state
    // (posted = just posted, matching = actively looking for taskers)
    if (!['posted', 'matching'].includes(task.state)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Task cannot be accepted in current state: ${task.state}. Task must be in 'posted' or 'matching' state.`
        }
      });
    }

    // Check if there's already a booking for this task
    const existingBooking = await pool.query(
      'SELECT * FROM bookings WHERE task_id = $1 AND status NOT IN ($2, $3)',
      [task_id, 'canceled', 'completed']
    );

    if (existingBooking.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'BOOKING_EXISTS',
          message: 'This task has already been accepted by another tasker'
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

      // Update task state to 'accepted'
      await client.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        ['accepted', task_id]
      );

      // Log state transition event
      await client.query(
        `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
         VALUES (uuid_generate_v4(), $1, $2, 'accepted', $3)`,
        [task_id, task.state, taskerId]
      );

      // Log booking event
      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id)
         VALUES (uuid_generate_v4(), $1, NULL, 'offered', $2)`,
        [bookingId, taskerId]
      );

      // Optionally add to candidates if not already there (for tracking)
      await client.query(
        `INSERT INTO task_candidates (task_id, tasker_id, rank, score)
         VALUES ($1, $2, 1, 1.0)
         ON CONFLICT (task_id, tasker_id) DO NOTHING`,
        [task_id, taskerId]
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
    const userId = req.user?.id;
    const { limit } = req.pagination;

    // Validate task_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(task_id)) {
      console.error(`Invalid task_id format: "${task_id}"`);
      return res.status(400).json({
        error: {
          code: 'INVALID_UUID',
          message: `Invalid task ID format: "${task_id}". Expected a valid UUID.`
        }
      });
    }

    // Validate userId is a valid UUID
    if (!userId || !uuidRegex.test(userId)) {
      console.error(`Invalid userId format: "${userId}", user object:`, req.user);
      return res.status(400).json({
        error: {
          code: 'INVALID_USER_ID',
          message: `Invalid user ID format: "${userId}". Expected a valid UUID.`
        }
      });
    }

    // Verify task belongs to user
    console.log(`Checking task ownership: task_id=${task_id}, userId=${userId}`);
    
    let task;
    try {
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

      task = taskResult.rows[0];
    } catch (dbError) {
      // Catch UUID errors specifically
      if (dbError.message && dbError.message.includes('invalid input syntax for type uuid')) {
        console.error('UUID validation error in database query:', {
          task_id,
          userId,
          error: dbError.message,
          params: { task_id, userId }
        });
        return res.status(400).json({
          error: {
            code: 'INVALID_UUID',
            message: `Invalid UUID format detected in database query. Task ID: "${task_id}", User ID: "${userId}". This suggests "me" or another non-UUID value is being passed. Original error: ${dbError.message}`
          }
        });
      }
      throw dbError; // Re-throw other errors
    }

    // First, try to get candidates from task_candidates table
    let result = await pool.query(
      `SELECT 
        tc.*,
        tp.rating_avg,
        tp.rating_count,
        tp.bio,
        tp.status as tasker_status,
        tp.acceptance_rate,
        tp.completion_rate,
        u.full_name,
        u.phone,
        uv.verification_status,
        uv.verified_at,
        tsa.center_lat as tasker_lat,
        tsa.center_lng as tasker_lng,
        tsa.radius_km,
        -- Calculate distance using Haversine formula (simplified)
        (6371 * acos(
          cos(radians($3)) * cos(radians(tsa.center_lat)) *
          cos(radians(tsa.center_lng) - radians($4)) +
          sin(radians($3)) * sin(radians(tsa.center_lat))
        )) AS distance_km
       FROM task_candidates tc
       JOIN tasker_profiles tp ON tc.tasker_id = tp.user_id
       JOIN users u ON tc.tasker_id = u.id
       LEFT JOIN user_verifications uv ON tc.tasker_id = uv.user_id
       LEFT JOIN tasker_service_areas tsa ON tc.tasker_id = tsa.tasker_id
       WHERE tc.task_id = $1
       ORDER BY tc.rank ASC
       LIMIT $2`,
      [task_id, limit, task.lat, task.lng]
    );

    // If no candidates in table (matching service not run yet), find available taskers
    if (result.rows.length === 0) {
      // Find taskers who:
      // 1. Have the task category in their categories (or show all if no category match)
      // 2. Are not already assigned to this task
      // 3. Distance calculation is optional (show taskers even without service area)
      try {
        result = await pool.query(
          `SELECT DISTINCT ON (u.id)
            u.id as tasker_id,
            tp.rating_avg,
            tp.rating_count,
            tp.bio,
            tp.status as tasker_status,
            tp.acceptance_rate,
            tp.completion_rate,
            u.full_name,
            u.phone,
            uv.verification_status,
            uv.verified_at,
            tsa.center_lat as tasker_lat,
            tsa.center_lng as tasker_lng,
            tsa.radius_km,
            -- Calculate distance using Haversine formula (or null if no service area)
            CASE 
              WHEN tsa.tasker_id IS NOT NULL AND tsa.center_lat IS NOT NULL AND tsa.center_lng IS NOT NULL THEN
                (6371 * acos(
                  LEAST(1.0, cos(radians($2)) * cos(radians(tsa.center_lat)) *
                  cos(radians(tsa.center_lng) - radians($3)) +
                  sin(radians($2)) * sin(radians(tsa.center_lat)))
                ))
              ELSE NULL
            END AS distance_km,
            -- Simple ranking: verified taskers first, then by rating, then by distance
            CASE 
              WHEN uv.verification_status = 'verified' THEN 1
              ELSE 2
            END as rank_priority,
            COALESCE(tp.rating_avg, 0) as rating_score
           FROM users u
           JOIN tasker_profiles tp ON u.id = tp.user_id
           LEFT JOIN tasker_categories tc_cat ON u.id = tc_cat.tasker_id AND tc_cat.category = $4
           LEFT JOIN user_verifications uv ON u.id = uv.user_id
           LEFT JOIN tasker_service_areas tsa ON u.id = tsa.tasker_id
           LEFT JOIN bookings b ON u.id = b.tasker_id AND b.task_id = $1 AND b.status NOT IN ('canceled', 'completed', 'disputed')
           WHERE u.role = 'tasker'
             AND tp.status IN ('verified', 'active', 'applied')
             AND b.id IS NULL  -- Not already assigned
             -- Show all taskers, but prefer those with matching category
             -- This is more lenient: show taskers even if they don't have the category
           ORDER BY 
             u.id,
             CASE WHEN tc_cat.tasker_id IS NOT NULL THEN 0 ELSE 1 END ASC,
             CASE 
               WHEN uv.verification_status = 'verified' THEN 1
               ELSE 2
             END ASC, 
             COALESCE(tp.rating_avg, 0) DESC, 
             COALESCE(
               CASE 
                 WHEN tsa.tasker_id IS NOT NULL AND tsa.center_lat IS NOT NULL AND tsa.center_lng IS NOT NULL THEN
                   (6371 * acos(
                     LEAST(1.0, cos(radians($2)) * cos(radians(tsa.center_lat)) *
                     cos(radians(tsa.center_lng) - radians($3)) +
                     sin(radians($2)) * sin(radians(tsa.center_lat)))
                   ))
                 ELSE NULL
               END,
               999
             ) ASC
           LIMIT $5`,
          [task_id, task.lat, task.lng, task.category, limit]
        );

        // Add rank and score for consistency with candidates format
        result.rows.forEach((row, index) => {
          row.rank = index + 1;
          const distanceScore = row.distance_km ? (1 - Math.min(row.distance_km / 50, 1)) : 0;
          row.score = (5 - row.rank_priority) * 0.3 + (row.rating_score / 5) * 0.5 + distanceScore * 0.2;
          row.explanation = JSON.stringify({
            verified: row.rank_priority === 1,
            rating: parseFloat(row.rating_score),
            distance: row.distance_km ? parseFloat(row.distance_km.toFixed(2)) : null
          });
        });
      } catch (queryError) {
        console.error('Error fetching available taskers:', queryError);
        console.error('Task details:', { task_id, category: task.category, lat: task.lat, lng: task.lng });
        // Return empty result if query fails
        result = { rows: [] };
      }
      
      // Log result for debugging
      if (result.rows.length === 0) {
        console.log(`No taskers found for task ${task_id} with category "${task.category}"`);
        console.log('This might be because:');
        console.log('- No taskers have profiles with status verified/active/applied');
        console.log('- All taskers are already assigned to this task');
        console.log('- Task category does not match any tasker categories');
      } else {
        console.log(`Found ${result.rows.length} taskers for task ${task_id}`);
      }
    }

    // Get skills and categories for each candidate
    const taskerIds = result.rows.map(row => row.tasker_id);
    let skillsMap = {};
    let categoriesMap = {};

    if (taskerIds.length > 0) {
      // Get skills
      const skillsResult = await pool.query(
        `SELECT tasker_id, skill 
         FROM tasker_skills 
         WHERE tasker_id = ANY($1)`,
        [taskerIds]
      );
      skillsMap = skillsResult.rows.reduce((acc, row) => {
        if (!acc[row.tasker_id]) acc[row.tasker_id] = [];
        acc[row.tasker_id].push(row.skill);
        return acc;
      }, {});

      // Get categories
      const categoriesResult = await pool.query(
        `SELECT tasker_id, category 
         FROM tasker_categories 
         WHERE tasker_id = ANY($1)`,
        [taskerIds]
      );
      categoriesMap = categoriesResult.rows.reduce((acc, row) => {
        if (!acc[row.tasker_id]) acc[row.tasker_id] = [];
        acc[row.tasker_id].push(row.category);
        return acc;
      }, {});
    }

    const items = result.rows.map((row, index) => {
      // Parse explanation if it's a string
      let explanation = row.explanation;
      if (typeof explanation === 'string') {
        try {
          explanation = JSON.parse(explanation);
        } catch (e) {
          explanation = { message: explanation };
        }
      }

      return {
        tasker: {
          user_id: row.tasker_id,
          full_name: row.full_name,
          phone: row.phone,
          bio: row.bio,
          rating: {
            average: parseFloat(row.rating_avg) || 0,
            count: row.rating_count || 0
          },
          skills: skillsMap[row.tasker_id] || [],
          categories: categoriesMap[row.tasker_id] || [],
          verification: {
            status: row.verification_status || 'unverified',
            verified_at: row.verified_at,
            is_verified: row.verification_status === 'verified' || row.tasker_status === 'verified'
          },
          stats: {
            acceptance_rate: parseFloat(row.acceptance_rate) || 0,
            completion_rate: parseFloat(row.completion_rate) || 0
          },
          service_area: row.tasker_lat ? {
            center: {
              lat: row.tasker_lat,
              lng: row.tasker_lng
            },
            radius_km: row.radius_km
          } : null
        },
        distance_km: row.distance_km ? parseFloat(row.distance_km.toFixed(2)) : null,
        // Note: Tasker-specific pricing not yet implemented, using task estimate
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
        score_explanation: explanation,
        rank: row.rank || (index + 1),
        score: parseFloat(row.score || 0)
      };
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export default router;
