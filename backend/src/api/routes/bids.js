import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/bids
 * Tasker submits or updates their bid (quote) for a task.
 * Body: task_id, amount, currency?, minimum_minutes?, message?, can_start_at?
 * If client already requested a quote (status 'requested'), this updates that row and sets status 'pending'.
 * Otherwise creates a new bid with status 'pending' (open-for-bids flow).
 */
router.post('/', authenticate, requireRole('tasker'), idempotency, async (req, res, next) => {
  try {
    const taskerId = req.user.id;
    const body = z.object({
      task_id: z.string().uuid(),
      amount: z.number().int().positive(),
      currency: z.string().default('EGP'),
      minimum_minutes: z.number().int().min(1).default(60),
      message: z.string().max(2000).optional(),
      can_start_at: z.string().datetime().optional(),
    }).parse(req.body);

    const { task_id, amount, currency, minimum_minutes, message, can_start_at } = body;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [task_id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }
    const task = taskResult.rows[0];
    if (!['posted', 'matching'].includes(task.state)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: 'Task is not open for bids' }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id, status FROM task_bids WHERE task_id = $1 AND tasker_id = $2',
        [task_id, taskerId]
      );

      let bidId;
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (!['requested', 'pending'].includes(row.status)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: { code: 'INVALID_BID_STATE', message: 'You cannot update this bid' }
          });
        }
        await client.query(
          `UPDATE task_bids SET amount = $1, currency = $2, minimum_minutes = $3, message = $4, can_start_at = $5::timestamptz, status = 'pending', updated_at = now()
           WHERE id = $6`,
          [amount, currency, minimum_minutes, message || null, can_start_at || null, row.id]
        );
        bidId = row.id;
      } else {
        bidId = uuidv4();
        await client.query(
          `INSERT INTO task_bids (id, task_id, tasker_id, amount, currency, minimum_minutes, message, can_start_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, 'pending')`,
          [bidId, task_id, taskerId, amount, currency, minimum_minutes, message || null, can_start_at || null]
        );
      }

      await client.query('COMMIT');

      const bidRow = (await pool.query('SELECT * FROM task_bids WHERE id = $1', [bidId])).rows[0];
      res.status(201).json({
        id: bidRow.id,
        task_id: bidRow.task_id,
        tasker_id: bidRow.tasker_id,
        amount: bidRow.amount,
        currency: bidRow.currency,
        minimum_minutes: bidRow.minimum_minutes,
        message: bidRow.message,
        can_start_at: bidRow.can_start_at,
        status: bidRow.status,
        created_at: bidRow.created_at,
        updated_at: bidRow.updated_at,
      });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.errors?.[0]?.message || 'Invalid body', details: error.errors }
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/bids/:bid_id/accept
 * Client accepts a bid. Creates booking from bid and sets bid status 'accepted'.
 */
router.post('/:bid_id/accept', authenticate, requireRole('client'), idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bid_id } = req.params;

    const bidResult = await pool.query(
      `SELECT b.*, t.client_id, t.currency AS task_currency
       FROM task_bids b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1`,
      [bid_id]
    );
    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bid not found' } });
    }
    const bid = bidResult.rows[0];
    if (bid.client_id !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your task' } });
    }
    if (bid.status !== 'pending') {
      return res.status(400).json({
        error: { code: 'INVALID_BID_STATE', message: 'Only pending bids can be accepted' }
      });
    }
    if (bid.amount == null) {
      return res.status(400).json({
        error: { code: 'INVALID_BID', message: 'Bid has no amount; tasker must submit their cost first' }
      });
    }

    const existingBooking = await pool.query(
      `SELECT id FROM bookings WHERE task_id = $1 AND status NOT IN ('canceled', 'disputed')`,
      [bid.task_id]
    );
    if (existingBooking.rows.length > 0) {
      return res.status(409).json({
        error: { code: 'BOOKING_EXISTS', message: 'Task already has an active booking' }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bookingId = uuidv4();
      await client.query(
        `INSERT INTO bookings (id, task_id, tasker_id, status, agreed_rate_amount, agreed_rate_currency, agreed_minimum_minutes, bid_id)
         VALUES ($1, $2, $3, 'offered', $4, $5, $6, $7)`,
        [
          bookingId,
          bid.task_id,
          bid.tasker_id,
          bid.amount,
          bid.currency || bid.task_currency || 'EGP',
          bid.minimum_minutes ?? 60,
          bid_id,
        ]
      );

      await client.query(
        `UPDATE task_bids SET status = 'accepted', updated_at = now() WHERE id = $1`,
        [bid_id]
      );

      await client.query(
        `UPDATE task_bids SET status = 'declined', updated_at = now() WHERE task_id = $1 AND id != $2 AND status = 'pending'`,
        [bid.task_id, bid_id]
      );

      await client.query(
        `INSERT INTO booking_events (id, booking_id, from_status, to_status, actor_user_id, meta)
         VALUES (uuid_generate_v4(), $1, NULL, 'offered', $2, $3)`,
        [bookingId, userId, JSON.stringify({ from_bid: bid_id })]
      );

      await client.query('COMMIT');

      const booking = (await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId])).rows[0];
      res.status(201).json({
        booking_id: booking.id,
        task_id: booking.task_id,
        tasker_id: booking.tasker_id,
        status: booking.status,
        agreed_rate: { currency: booking.agreed_rate_currency, amount: booking.agreed_rate_amount },
        agreed_minimum_minutes: booking.agreed_minimum_minutes,
        message: 'Bid accepted. Tasker will be notified to confirm.',
      });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/bids/:bid_id/decline
 * Client declines a bid. Sets bid status 'declined'.
 */
router.post('/:bid_id/decline', authenticate, requireRole('client'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bid_id } = req.params;

    const bidResult = await pool.query(
      `SELECT b.*, t.client_id FROM task_bids b JOIN tasks t ON b.task_id = t.id WHERE b.id = $1`,
      [bid_id]
    );
    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bid not found' } });
    }
    const bid = bidResult.rows[0];
    if (bid.client_id !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your task' } });
    }
    if (!['requested', 'pending'].includes(bid.status)) {
      return res.status(400).json({
        error: { code: 'INVALID_BID_STATE', message: 'Bid cannot be declined' }
      });
    }

    await pool.query(
      `UPDATE task_bids SET status = 'declined', updated_at = now() WHERE id = $1`,
      [bid_id]
    );
    res.json({ bid_id, status: 'declined', message: 'Bid declined' });
  } catch (error) {
    next(error);
  }
});

export default router;
