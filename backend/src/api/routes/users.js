import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import pool from '../../config/database.js';

const router = express.Router();

/**
 * GET /api/v1/users/me
 * Get current user
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, role, phone, email, full_name, locale, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/me
 * Update current user profile
 */
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, email, locale } = z.object({
      full_name: z.string().optional(),
      email: z.string().email().optional(),
      locale: z.string().optional()
    }).parse(req.body);

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      params.push(full_name);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }

    if (locale !== undefined) {
      updates.push(`locale = $${paramIndex++}`);
      params.push(locale);
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
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT id, role, phone, email, full_name, locale, created_at FROM users WHERE id = $1',
      [userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
