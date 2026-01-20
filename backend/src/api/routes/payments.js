import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/payments/intents
 * Create or update payment intent
 */
router.post('/intents', authenticate, idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { booking_id, method, amount_authorized, wallet_provider } = z.object({
      booking_id: z.string().uuid(),
      method: z.enum(['cash', 'wallet', 'card']),
      amount_authorized: z.object({
        currency: z.string(),
        amount: z.number()
      }),
      wallet_provider: z.string().optional()
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

    // Check if intent exists
    const existingIntent = await pool.query(
      'SELECT * FROM payment_intents WHERE booking_id = $1',
      [booking_id]
    );

    let intentId;
    if (existingIntent.rows.length > 0) {
      intentId = existingIntent.rows[0].id;
      await pool.query(
        `UPDATE payment_intents 
         SET method = $1, amount_authorized = $2, provider = $3, updated_at = now()
         WHERE id = $4`,
        [method, amount_authorized.amount, wallet_provider || null, intentId]
      );
    } else {
      intentId = uuidv4();
      await pool.query(
        `INSERT INTO payment_intents (
          id, booking_id, method, amount_authorized, currency, provider, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'requires_action')`,
        [
          intentId,
          booking_id,
          method,
          amount_authorized.amount,
          amount_authorized.currency,
          wallet_provider || null
        ]
      );
    }

    const result = await pool.query('SELECT * FROM payment_intents WHERE id = $1', [intentId]);

    res.status(201).json({
      id: result.rows[0].id,
      booking_id: result.rows[0].booking_id,
      method: result.rows[0].method,
      status: result.rows[0].status,
      amount_authorized: {
        currency: result.rows[0].currency,
        amount: result.rows[0].amount_authorized
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payments/intents/:intent_id/capture
 * Capture funds or confirm cash
 */
router.post('/intents/:intent_id/capture', authenticate, async (req, res, next) => {
  try {
    const { intent_id } = req.params;
    const userId = req.user.id;
    const { captured_amount, cash_confirmed_by } = z.object({
      captured_amount: z.object({
        currency: z.string(),
        amount: z.number()
      }).optional(),
      cash_confirmed_by: z.enum(['client', 'tasker', 'ops']).optional()
    }).parse(req.body);

    const intentResult = await pool.query(
      `SELECT pi.*, b.tasker_id, t.client_id
       FROM payment_intents pi
       JOIN bookings b ON pi.booking_id = b.id
       JOIN tasks t ON b.task_id = t.id
       WHERE pi.id = $1`,
      [intent_id]
    );

    if (intentResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment intent not found'
        }
      });
    }

    const intent = intentResult.rows[0];

    // Verify authorization
    const isClient = intent.client_id === userId;
    const isTasker = intent.tasker_id === userId;
    const isOps = req.user.role === 'ops' || req.user.role === 'admin';

    if (intent.method === 'cash' && !cash_confirmed_by) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'cash_confirmed_by is required for cash payments'
        }
      });
    }

    if (intent.method === 'cash' && !isClient && !isTasker && !isOps) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to confirm cash payment'
        }
      });
    }

    const amount = captured_amount?.amount || intent.amount_authorized;

    await pool.query(
      `UPDATE payment_intents 
       SET status = 'captured', updated_at = now()
       WHERE id = $1`,
      [intent_id]
    );

    // TODO: Create ledger entries for double-entry accounting
    // TODO: Trigger payout scheduling for tasker

    res.json({
      id: intent_id,
      status: 'captured',
      captured_amount: {
        currency: intent.currency,
        amount: amount
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
