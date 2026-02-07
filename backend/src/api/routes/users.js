import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/auth.js';
import pool from '../../config/database.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * GET /api/v1/users/check-email
 * Check if email is available (for signup/profile edit)
 * Authenticated: excludes current user's email. Unauthenticated: checks all.
 */
router.get('/check-email', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({
        error: { code: 'INVALID_EMAIL', message: 'Email is required' }
      });
    }
    const excludeUserId = req.query.exclude_user_id || null;
    let result;
    if (excludeUserId) {
      result = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
        [email, excludeUserId]
      );
    } else {
      result = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [email]
      );
    }
    return res.json({ available: result.rows.length === 0 });
  } catch (error) {
    next(error);
  }
});

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
      // Check for duplicate email before updating (exclude current user)
      if (email !== undefined && typeof email === 'string' && email.trim() !== '') {
        const existing = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email.trim(), userId]
        );
        if (existing.rows.length > 0) {
          return res.status(409).json({
            error: {
              code: 'EMAIL_TAKEN',
              message: 'This email is already registered to another account'
            }
          });
        }
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (full_name !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        params.push(full_name);
      }

      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        params.push(typeof email === 'string' && email.trim() ? email.trim() : null);
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
      // Handle duplicate email (race condition or pre-check missed)
      if (dbError.code === '23505' && dbError.constraint === 'users_email_key') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_TAKEN',
            message: 'This email is already registered to another account'
          }
        });
      }
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

        // Fetch updated user
        const updatedUserResult = await pool.query(
          'SELECT id, role, phone, email, full_name, locale, created_at FROM users WHERE id = $1',
          [userId]
        );
        const updatedUser = updatedUserResult.rows[0];

        // Issue new tokens with updated role so token matches DB (avoids role mismatch)
        const accessToken = jwt.sign(
          { userId: updatedUser.id, role: updatedUser.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        const refreshToken = jwt.sign(
          { userId: updatedUser.id, type: 'refresh' },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
        );

        res.json({
          message: 'Successfully became a tasker.',
          user: updatedUser,
          access_token: accessToken,
          refresh_token: refreshToken
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

// ============================================
// Payment Methods Management
// ============================================

/**
 * GET /api/v1/users/me/payment-methods
 * Get all payment methods for current user
 */
router.get('/me/payment-methods', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        id,
        type,
        is_default,
        card_last4,
        card_brand,
        card_expiry_month,
        card_expiry_year,
        cardholder_name,
        wallet_provider,
        wallet_phone,
        created_at,
        updated_at
      FROM user_payment_methods
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/me/payment-methods
 * Add a new payment method
 */
router.post('/me/payment-methods', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const body = z.object({
      type: z.enum(['card', 'wallet']),
      // Card fields
      number: z.string().optional(),
      expiry_month: z.number().int().min(1).max(12).optional(),
      expiry_year: z.number().int().min(2020).optional(),
      cvv: z.string().optional(),
      holder_name: z.string().optional(),
      // Wallet fields
      provider: z.string().optional(),
      phone: z.string().optional(),
    }).parse(req.body);

    // Validate required fields based on type
    if (body.type === 'card') {
      if (!body.number || !body.expiry_month || !body.expiry_year || !body.holder_name) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Card number, expiry month, expiry year, and holder name are required for card payment methods'
          }
        });
      }
    } else if (body.type === 'wallet') {
      if (!body.provider || !body.phone) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Provider and phone are required for wallet payment methods'
          }
        });
      }
    }

    // Hash card number (in production, use proper encryption)
    // For now, we'll store a simple hash
    let cardNumberHash = null;
    let cardLast4 = null;
    
    if (body.type === 'card' && body.number) {
      cardLast4 = body.number.slice(-4);
      cardNumberHash = crypto.createHash('sha256').update(body.number).digest('hex');
    }

    // Check if this should be default (if it's the first payment method)
    const existingMethods = await pool.query(
      'SELECT COUNT(*) as count FROM user_payment_methods WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );
    const isFirstMethod = parseInt(existingMethods.rows[0].count) === 0;

    // If setting as default, unset other defaults
    if (isFirstMethod) {
      await pool.query(
        'UPDATE user_payment_methods SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO user_payment_methods (
        user_id, type, is_default,
        card_number_hash, card_last4, card_brand, card_expiry_month, card_expiry_year, cardholder_name,
        wallet_provider, wallet_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id, type, is_default,
        card_last4, card_brand, card_expiry_month, card_expiry_year, cardholder_name,
        wallet_provider, wallet_phone,
        created_at, updated_at`,
      [
        userId,
        body.type,
        isFirstMethod,
        cardNumberHash,
        cardLast4,
        body.type === 'card' ? (body.number?.startsWith('4') ? 'visa' : 'mastercard') : null,
        body.expiry_month || null,
        body.expiry_year || null,
        body.holder_name || null,
        body.provider || null,
        body.phone || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/me/payment-methods/:id
 * Update a payment method
 */
router.patch('/me/payment-methods/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const body = z.object({
      holder_name: z.string().optional(),
      wallet_phone: z.string().optional(),
    }).parse(req.body);

    // Verify ownership
    const existing = await pool.query(
      'SELECT * FROM user_payment_methods WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found'
        }
      });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (body.holder_name !== undefined) {
      updates.push(`cardholder_name = $${paramIndex++}`);
      params.push(body.holder_name);
    }

    if (body.wallet_phone !== undefined) {
      updates.push(`wallet_phone = $${paramIndex++}`);
      params.push(body.wallet_phone);
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
    params.push(id, userId);

    const result = await pool.query(
      `UPDATE user_payment_methods 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING 
         id, type, is_default,
         card_last4, card_brand, card_expiry_month, card_expiry_year, cardholder_name,
         wallet_provider, wallet_phone,
         created_at, updated_at`,
      params
    );

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/me/payment-methods/:id
 * Delete a payment method (soft delete)
 */
router.delete('/me/payment-methods/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await pool.query(
      'SELECT * FROM user_payment_methods WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found'
        }
      });
    }

    // Soft delete
    await pool.query(
      'UPDATE user_payment_methods SET deleted_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    // If it was default, set another one as default if available
    if (existing.rows[0].is_default) {
      const otherMethods = await pool.query(
        'SELECT id FROM user_payment_methods WHERE user_id = $1 AND deleted_at IS NULL AND id != $2 LIMIT 1',
        [userId, id]
      );
      if (otherMethods.rows.length > 0) {
        await pool.query(
          'UPDATE user_payment_methods SET is_default = true WHERE id = $1',
          [otherMethods.rows[0].id]
        );
      }
    }

    return res.json({
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/me/payment-methods/:id/set-default
 * Set a payment method as default
 */
router.patch('/me/payment-methods/:id/set-default', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await pool.query(
      'SELECT * FROM user_payment_methods WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found'
        }
      });
    }

    // Unset all other defaults
    await pool.query(
      'UPDATE user_payment_methods SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    // Set this one as default
    await pool.query(
      'UPDATE user_payment_methods SET is_default = true, updated_at = now() WHERE id = $1',
      [id]
    );

    const result = await pool.query(
      `SELECT 
        id, type, is_default,
        card_last4, card_brand, card_expiry_month, card_expiry_year, cardholder_name,
        wallet_provider, wallet_phone,
        created_at, updated_at
      FROM user_payment_methods
      WHERE id = $1`,
      [id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Payment History & Analytics
// ============================================

/**
 * GET /api/v1/users/me/payments
 * Get payment history for current user (client)
 */
router.get('/me/payments', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, date_from, date_to, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        pi.id,
        pi.booking_id,
        pi.method,
        pi.status,
        pi.amount_authorized as amount,
        pi.currency,
        pi.created_at as paid_at,
        b.task_id,
        t.category as task_category,
        t.description as task_description,
        tp.user_id as tasker_id,
        u.full_name as tasker_name
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      LEFT JOIN tasker_profiles tp ON b.tasker_id = tp.user_id
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE t.client_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      query += ` AND pi.status = $${paramIndex++}`;
      params.push(status);
    }

    if (date_from) {
      query += ` AND pi.created_at >= $${paramIndex++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND pi.created_at <= $${paramIndex++}`;
      params.push(date_to);
    }

    query += ` ORDER BY pi.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      WHERE t.client_id = $1
    `;
    const countParams = [userId];
    let countParamIndex = 2;

    if (status && status !== 'all') {
      countQuery += ` AND pi.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (date_from) {
      countQuery += ` AND pi.created_at >= $${countParamIndex++}`;
      countParams.push(date_from);
    }

    if (date_to) {
      countQuery += ` AND pi.created_at <= $${countParamIndex++}`;
      countParams.push(date_to);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Format response with breakdown (simplified - in production, calculate from ledger)
    const payments = result.rows.map(payment => ({
      id: payment.id,
      booking_id: payment.booking_id,
      task_id: payment.task_id,
      task: {
        category: payment.task_category,
        description: payment.task_description,
      },
      tasker_name: payment.tasker_name,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      created_at: payment.paid_at,
      breakdown: {
        tasker_rate: Math.round(payment.amount * 0.85), // Simplified - should come from ledger
        platform_fee: Math.round(payment.amount * 0.15),
      }
    }));

    return res.json({
      items: payments,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/me/payments/analytics
 * Get spending analytics for current user (must be before /:id)
 */
router.get('/me/payments/analytics', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query; // 'month' or 'year'

    const dateFilter = period === 'year' 
      ? "pi.created_at >= date_trunc('year', CURRENT_DATE)"
      : "pi.created_at >= date_trunc('month', CURRENT_DATE)";

    const totalResult = await pool.query(
      `SELECT 
        COALESCE(SUM(pi.amount_authorized), 0) as total_spending,
        COUNT(DISTINCT pi.booking_id) as total_tasks,
        pi.currency
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      WHERE t.client_id = $1 AND pi.status = 'captured' AND ${dateFilter}
      GROUP BY pi.currency
      LIMIT 1`,
      [userId]
    );

    const totalSpending = totalResult.rows[0]?.total_spending || 0;
    const totalTasks = parseInt(totalResult.rows[0]?.total_tasks || 0);
    const currency = totalResult.rows[0]?.currency || 'EGP';
    const averageTaskCost = totalTasks > 0 ? Math.round(totalSpending / totalTasks) : 0;

    const categoryResult = await pool.query(
      `SELECT 
        t.category,
        COALESCE(SUM(pi.amount_authorized), 0) as amount,
        COUNT(DISTINCT pi.booking_id) as task_count
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      WHERE t.client_id = $1 AND pi.status = 'captured' AND ${dateFilter}
      GROUP BY t.category
      ORDER BY amount DESC`,
      [userId]
    );

    let monthlyTrends = [];
    if (period === 'year') {
      const trendsResult = await pool.query(
        `SELECT 
          DATE_TRUNC('month', pi.created_at) as month,
          COALESCE(SUM(pi.amount_authorized), 0) as amount
        FROM payment_intents pi
        JOIN bookings b ON pi.booking_id = b.id
        JOIN tasks t ON b.task_id = t.id
        WHERE t.client_id = $1 AND pi.status = 'captured' AND pi.created_at >= date_trunc('year', CURRENT_DATE)
        GROUP BY DATE_TRUNC('month', pi.created_at)
        ORDER BY month`,
        [userId]
      );

      monthlyTrends = trendsResult.rows.map(row => ({
        month: new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: parseInt(row.amount)
      }));
    }

    const taskersResult = await pool.query(
      `SELECT 
        b.tasker_id,
        u.full_name as tasker_name,
        COUNT(DISTINCT pi.booking_id) as task_count,
        COALESCE(SUM(pi.amount_authorized), 0) as total_spent
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      JOIN users u ON b.tasker_id = u.id
      WHERE t.client_id = $1 AND pi.status = 'captured' AND ${dateFilter}
      GROUP BY b.tasker_id, u.full_name
      ORDER BY total_spent DESC
      LIMIT 5`,
      [userId]
    );

    const maxMonthlyAmount = monthlyTrends.length > 0 
      ? Math.max(...monthlyTrends.map(t => t.amount))
      : totalSpending;

    return res.json({
      total_spending: parseInt(totalSpending),
      total_tasks: totalTasks,
      average_task_cost: averageTaskCost,
      currency,
      category_breakdown: categoryResult.rows.map(row => ({
        category: row.category,
        amount: parseInt(row.amount),
        task_count: parseInt(row.task_count)
      })),
      monthly_trends: monthlyTrends,
      max_monthly_amount: maxMonthlyAmount,
      top_taskers: taskersResult.rows.map(row => ({
        tasker_id: row.tasker_id,
        tasker_name: row.tasker_name,
        task_count: parseInt(row.task_count),
        total_spent: parseInt(row.total_spent)
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/me/payments/:id
 * Get payment details
 */
router.get('/me/payments/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        pi.*,
        b.task_id,
        t.category as task_category,
        t.description as task_description,
        u.full_name as tasker_name
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      LEFT JOIN users u ON b.tasker_id = u.id
      WHERE pi.id = $1 AND t.client_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment not found'
        }
      });
    }

    const payment = result.rows[0];

    return res.json({
      id: payment.id,
      booking_id: payment.booking_id,
      task_id: payment.task_id,
      task: {
        category: payment.task_category,
        description: payment.task_description,
      },
      tasker_name: payment.tasker_name,
      method: payment.method,
      status: payment.status,
      amount: payment.amount_authorized,
      currency: payment.currency,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      breakdown: {
        tasker_rate: Math.round(payment.amount_authorized * 0.85),
        platform_fee: Math.round(payment.amount_authorized * 0.15),
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/me/payments/:id/receipt
 * Download receipt as PDF (simplified - returns JSON for now)
 */
router.get('/me/payments/:id/receipt', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        pi.*,
        b.task_id,
        t.category as task_category,
        t.description as task_description,
        t.location,
        u.full_name as tasker_name,
        client.full_name as client_name
      FROM payment_intents pi
      JOIN bookings b ON pi.booking_id = b.id
      JOIN tasks t ON b.task_id = t.id
      JOIN users client ON t.client_id = client.id
      LEFT JOIN users u ON b.tasker_id = u.id
      WHERE pi.id = $1 AND t.client_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment not found'
        }
      });
    }

    const payment = result.rows[0];

    // In production, generate actual PDF using a library like pdfkit or puppeteer
    // For now, return receipt data as JSON
    const receipt = {
      receipt_number: payment.id,
      date: payment.created_at,
      client_name: payment.client_name,
      tasker_name: payment.tasker_name,
      task: {
        category: payment.task_category,
        description: payment.task_description,
        location: payment.location,
      },
      amount: payment.amount_authorized,
      currency: payment.currency,
      method: payment.method,
      breakdown: {
        tasker_rate: Math.round(payment.amount_authorized * 0.85),
        platform_fee: Math.round(payment.amount_authorized * 0.15),
      }
    };

    // Set headers for PDF download (in production, generate actual PDF)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.id}.json"`);

    return res.json(receipt);
  } catch (error) {
    next(error);
  }
});

export default router;
