import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/notifications/tokens
 * Register push notification token
 */
router.post('/tokens', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { device_id, push_token, platform } = z.object({
      device_id: z.string(),
      push_token: z.string(),
      platform: z.enum(['ios', 'android', 'web'])
    }).parse(req.body);

    await pool.query(
      `UPDATE user_devices 
       SET push_token = $1, platform = $2, last_seen_at = now()
       WHERE user_id = $3 AND device_id = $4`,
      [push_token, platform, userId, device_id]
    );

    res.json({
      message: 'Push token registered successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/notifications
 * List notifications
 */
router.get('/', authenticate, pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;
    const { unread_only } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (unread_only === 'true') {
      query += ` AND read_at IS NULL`;
    }

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM notifications WHERE id = $${paramIndex++})`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const notifications = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? notifications[notifications.length - 1].id : null;

    res.json(formatPaginatedResponse(notifications, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/notifications/:notification_id/read
 * Mark notification as read
 */
router.patch('/:notification_id/read', authenticate, async (req, res, next) => {
  try {
    const { notification_id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications 
       SET read_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notification_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/notifications/preferences
 * Get notification preferences
 */
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      await pool.query(
        `INSERT INTO notification_preferences (user_id)
         VALUES ($1)`,
        [userId]
      );
      const newResult = await pool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );
      return res.json(newResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/notifications/preferences
 * Update notification preferences
 */
router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { push_enabled, sms_enabled, email_enabled, preferences } = z.object({
      push_enabled: z.boolean().optional(),
      sms_enabled: z.boolean().optional(),
      email_enabled: z.boolean().optional(),
      preferences: z.record(z.any()).optional()
    }).parse(req.body);

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (push_enabled !== undefined) {
      updates.push(`push_enabled = $${paramIndex++}`);
      params.push(push_enabled);
    }

    if (sms_enabled !== undefined) {
      updates.push(`sms_enabled = $${paramIndex++}`);
      params.push(sms_enabled);
    }

    if (email_enabled !== undefined) {
      updates.push(`email_enabled = $${paramIndex++}`);
      params.push(email_enabled);
    }

    if (preferences !== undefined) {
      updates.push(`preferences = $${paramIndex++}`);
      params.push(JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No fields to update'
        }
      });
    }

    updates.push('updated_at = now()');
    params.push(userId);

    await pool.query(
      `UPDATE notification_preferences 
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
