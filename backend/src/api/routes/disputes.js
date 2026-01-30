import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/disputes
 * Open a dispute
 */
router.post('/', authenticate, idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { booking_id, reason, amount_in_question } = z.object({
      booking_id: z.string().uuid(),
      reason: z.string(),
      amount_in_question: z.number().optional()
    }).parse(req.body);

    // Verify booking access
    const bookingResult = await pool.query(
      `SELECT b.*, t.client_id
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)`,
      [booking_id, userId]
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

    // Check if dispute already exists
    const existingDispute = await pool.query(
      'SELECT * FROM disputes WHERE booking_id = $1',
      [booking_id]
    );

    if (existingDispute.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'DISPUTE_EXISTS',
          message: 'Dispute already exists for this booking'
        }
      });
    }

    const disputeId = uuidv4();
    const result = await pool.query(
      `INSERT INTO disputes (
        id, booking_id, opened_by, reason, amount_in_question, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *`,
      [
        disputeId,
        booking_id,
        userId,
        reason,
        amount_in_question || null,
        booking.agreed_rate_currency || 'EGP'
      ]
    );

    // Update booking and task status
    await pool.query(
      'UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2',
      ['disputed', booking_id]
    );

    const taskStateRow = await pool.query('SELECT state FROM tasks WHERE id = $1', [booking.task_id]);
    const currentTaskState = taskStateRow.rows[0]?.state;
    await pool.query(
      'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
      ['disputed', booking.task_id]
    );
    await pool.query(
      `INSERT INTO task_state_events (id, task_id, from_state, to_state, actor_user_id)
       VALUES (uuid_generate_v4(), $1, $2, 'disputed', $3)`,
      [booking.task_id, currentTaskState, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/disputes/:dispute_id
 * Get dispute details
 */
router.get('/:dispute_id', authenticate, async (req, res, next) => {
  try {
    const { dispute_id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT d.*, b.tasker_id, t.client_id
       FROM disputes d
       JOIN bookings b ON d.booking_id = b.id
       JOIN tasks t ON b.task_id = t.id
       WHERE d.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2 OR $3 IN ('admin', 'ops'))`,
      [dispute_id, userId, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dispute not found'
        }
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/disputes/:dispute_id/evidence
 * Add evidence to dispute
 */
router.post('/:dispute_id/evidence', authenticate, async (req, res, next) => {
  try {
    const { dispute_id } = req.params;
    const userId = req.user.id;
    const { evidence } = req.body;

    // Verify access
    const disputeResult = await pool.query(
      `SELECT d.*, b.tasker_id, t.client_id
       FROM disputes d
       JOIN bookings b ON d.booking_id = b.id
       JOIN tasks t ON b.task_id = t.id
       WHERE d.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)`,
      [dispute_id, userId]
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

    if (dispute.status !== 'open') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Can only add evidence to open disputes'
        }
      });
    }

    // Update resolution with evidence
    const currentResolution = dispute.resolution || {};
    const evidenceList = currentResolution.evidence || [];
    evidenceList.push({
      user_id: userId,
      evidence: evidence,
      added_at: new Date().toISOString()
    });

    await pool.query(
      `UPDATE disputes 
       SET resolution = $1, updated_at = now()
       WHERE id = $2`,
      [JSON.stringify({ ...currentResolution, evidence: evidenceList }), dispute_id]
    );

    res.json({
      message: 'Evidence added successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
