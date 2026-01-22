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

    try {
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

      return res.json(result.rows[0]);
    } catch (dbError) {
      // Fallback: Check in-memory user store if database is not available
      if (global.userStore) {
        const user = Array.from(global.userStore.values()).find(u => u.id === userId);
        if (user) {
          return res.json({
            ...user,
            created_at: new Date().toISOString()
          });
        }
      }
      
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }
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

    if (!full_name && !email && !locale) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No fields to update'
        }
      });
    }

    try {
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

      return res.json(result.rows[0]);
    } catch (dbError) {
      // Fallback: Update in-memory user store if database is not available
      if (global.userStore) {
        const user = Array.from(global.userStore.values()).find(u => u.id === userId);
        if (user) {
          if (full_name !== undefined) user.full_name = full_name;
          if (email !== undefined) user.email = email;
          if (locale !== undefined) user.locale = locale;
          
          return res.json({
            ...user,
            created_at: new Date().toISOString()
          });
        }
      }
      
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/become-tasker
 * Request to become a tasker (changes role and creates tasker profile)
 */
router.post('/me/become-tasker', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    try {
      // Check if already a tasker
      const userResult = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      if (userResult.rows[0].role === 'tasker') {
        return res.status(400).json({
          error: {
            code: 'ALREADY_TASKER',
            message: 'User is already a tasker'
          }
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update user role
        await client.query(
          'UPDATE users SET role = $1, updated_at = now() WHERE id = $2',
          ['tasker', userId]
        );

        // Create tasker profile if it doesn't exist
        await client.query(
          `INSERT INTO tasker_profiles (user_id, status, rating_avg, rating_count, acceptance_rate, completion_rate)
           VALUES ($1, 'applied', 0, 0, 0, 0)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );

        // Create default service area (Cairo) if it doesn't exist
        await client.query(
          `INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
           VALUES ($1, 30.0444, 31.2357, 10)
           ON CONFLICT (tasker_id) DO NOTHING`,
          [userId]
        );

        await client.query('COMMIT');

        // Update user in response
        const updatedUserResult = await pool.query(
          'SELECT id, role, phone, email, full_name, locale, created_at FROM users WHERE id = $1',
          [userId]
        );

        res.json({
          message: 'Successfully became a tasker. Please logout and login again to access tasker features.',
          user: updatedUserResult.rows[0]
        });
      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }
    } catch (dbError) {
      return res.status(503).json({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update role. Please try updating directly in the database.'
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
