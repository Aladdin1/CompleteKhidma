import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

/**
 * POST /api/v1/webhooks/subscriptions
 * Create webhook subscription
 */
router.post('/subscriptions', authenticate, idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { url, events } = z.object({
      url: z.string().url(),
      events: z.array(z.string())
    }).parse(req.body);

    const subscriptionId = uuidv4();
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO webhook_subscriptions (id, user_id, url, events, secret)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, url, events, active, created_at`,
      [subscriptionId, userId, url, events, secret]
    );

    res.status(201).json({
      ...result.rows[0],
      secret // Return secret only once
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/webhooks/subscriptions
 * List webhook subscriptions
 */
router.get('/subscriptions', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, url, events, active, created_at, updated_at
       FROM webhook_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      subscriptions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/webhooks/subscriptions/:subscription_id
 * Delete webhook subscription
 */
router.delete('/subscriptions/:subscription_id', authenticate, async (req, res, next) => {
  try {
    const { subscription_id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM webhook_subscriptions WHERE id = $1 AND user_id = $2 RETURNING id',
      [subscription_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/webhooks/deliveries
 * Get webhook delivery logs
 */
router.get('/deliveries', authenticate, pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;
    const { subscription_id, status } = req.query;

    let query = `
      SELECT wd.*
      FROM webhook_deliveries wd
      JOIN webhook_subscriptions ws ON wd.subscription_id = ws.id
      WHERE ws.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (subscription_id) {
      query += ` AND wd.subscription_id = $${paramIndex++}`;
      params.push(subscription_id);
    }

    if (status) {
      query += ` AND wd.status = $${paramIndex++}`;
      params.push(status);
    }

    if (cursor) {
      query += ` AND wd.created_at < (SELECT created_at FROM webhook_deliveries WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }

    query += ` ORDER BY wd.created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const deliveries = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? deliveries[deliveries.length - 1].id : null;

    res.json(formatPaginatedResponse(deliveries, nextCursor));
  } catch (error) {
    next(error);
  }
});

export default router;
