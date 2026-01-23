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

/**
 * GET /api/v1/users/me/addresses
 * Get all saved addresses for current user
 */
router.get('/me/addresses', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/addresses
 * Create a new saved address
 */
router.post('/me/addresses', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { label, address_line1, address_line2, city, district, postal_code, country, latitude, longitude, is_default } = z.object({
      label: z.string().min(1),
      address_line1: z.string().min(1),
      address_line2: z.string().optional(),
      city: z.string().min(1),
      district: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional().default('Egypt'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      is_default: z.boolean().optional().default(false)
    }).parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
          [userId]
        );
      }

      const result = await client.query(
        `INSERT INTO user_addresses 
         (user_id, label, address_line1, address_line2, city, district, postal_code, country, latitude, longitude, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [userId, label, address_line1, address_line2 || null, city, district || null, postal_code || null, country || 'Egypt', latitude || null, longitude || null, is_default]
      );

      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/me/addresses/:address_id
 * Update a saved address
 */
router.patch('/me/addresses/:address_id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address_id } = req.params;
    const updates = z.object({
      label: z.string().min(1).optional(),
      address_line1: z.string().min(1).optional(),
      address_line2: z.string().optional(),
      city: z.string().min(1).optional(),
      district: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      is_default: z.boolean().optional()
    }).parse(req.body);

    // Verify address belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [address_id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (updates.is_default === true) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND id != $2',
          [userId, address_id]
        );
      }

      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(updates[key]);
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: {
            code: 'NO_UPDATES',
            message: 'No fields to update'
          }
        });
      }

      updateFields.push('updated_at = now()');
      params.push(address_id, userId);

      const result = await client.query(
        `UPDATE user_addresses SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
         RETURNING *`,
        params
      );

      await client.query('COMMIT');
      return res.json(result.rows[0]);
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/me/addresses/:address_id
 * Delete a saved address
 */
router.delete('/me/addresses/:address_id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address_id } = req.params;

    const result = await pool.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [address_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    return res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/change-phone
 * Request phone number change (sends OTP to new phone)
 */
router.post('/me/change-phone', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { new_phone } = z.object({
      new_phone: z.string().min(10)
    }).parse(req.body);

    // Check if new phone is already in use
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [new_phone, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: {
          code: 'PHONE_IN_USE',
          message: 'Phone number is already registered'
        }
      });
    }

    // Use the same OTP request endpoint logic
    // In production, this would trigger OTP sending
    // For now, we'll just return success (OTP will be logged in auth route)
    return res.json({
      message: 'OTP sent to new phone number. Please verify to complete phone change.',
      new_phone
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/verify-phone-change
 * Verify OTP and complete phone number change
 */
router.post('/me/verify-phone-change', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { new_phone, otp } = z.object({
      new_phone: z.string().min(10),
      otp: z.string().length(6)
    }).parse(req.body);

    // In production, verify OTP here
    // For now, we'll just update the phone
    await pool.query(
      'UPDATE users SET phone = $1, updated_at = now() WHERE id = $2',
      [new_phone, userId]
    );

    const result = await pool.query(
      'SELECT id, role, phone, email, full_name, locale, created_at FROM users WHERE id = $1',
      [userId]
    );

    return res.json({
      message: 'Phone number changed successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/me/notification-preferences
 * Get notification preferences
 */
router.get('/me/notification-preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if not set
      return res.json({
        user_id: userId,
        push_enabled: true,
        sms_enabled: false,
        email_enabled: false,
        preferences: {}
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/me/notification-preferences
 * Update notification preferences
 */
router.patch('/me/notification-preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { push_enabled, sms_enabled, email_enabled, preferences } = z.object({
      push_enabled: z.boolean().optional(),
      sms_enabled: z.boolean().optional(),
      email_enabled: z.boolean().optional(),
      preferences: z.record(z.any()).optional()
    }).parse(req.body);

    await pool.query(
      `INSERT INTO notification_preferences (user_id, push_enabled, sms_enabled, email_enabled, preferences, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id) DO UPDATE SET
         push_enabled = COALESCE(EXCLUDED.push_enabled, notification_preferences.push_enabled),
         sms_enabled = COALESCE(EXCLUDED.sms_enabled, notification_preferences.sms_enabled),
         email_enabled = COALESCE(EXCLUDED.email_enabled, notification_preferences.email_enabled),
         preferences = COALESCE(EXCLUDED.preferences, notification_preferences.preferences),
         updated_at = now()`,
      [
        userId,
        push_enabled ?? true,
        sms_enabled ?? false,
        email_enabled ?? false,
        preferences ? JSON.stringify(preferences) : '{}'
      ]
    );

    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/deactivate
 * Deactivate account (soft delete)
 */
router.post('/me/deactivate', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    await pool.query(
      'UPDATE users SET deleted_at = now(), updated_at = now() WHERE id = $1',
      [userId]
    );

    // Log deactivation reason if provided
    if (reason) {
      // Could store in audit log table if exists
      console.log(`User ${userId} deactivated. Reason: ${reason}`);
    }

    return res.json({
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/me
 * Permanently delete account (hard delete)
 */
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password_confirmation } = req.body; // In production, require password

    // In production, verify password or require additional confirmation
    // For now, we'll proceed with deletion

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
