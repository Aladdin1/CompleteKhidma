import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import pool from '../../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * GET /api/v1/debug/otp?phone=+20...
 * Dev-only: return current OTP for phone (from in-memory store).
 * Used by test scripts. Disabled when NODE_ENV=production.
 */
router.get('/otp', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const raw = (req.query.phone || '').trim();
  const phone = raw.replace(/[\s\-\(\)]/g, '');
  if (!phone) {
    return res.status(400).json({ error: 'Missing phone query' });
  }
  const key = `otp:${phone}`;
  const stored = global.otpStore?.get(key);
  if (!stored || Date.now() > stored.expires) {
    const debug = {
      key,
      hasStore: !!global.otpStore,
      keys: global.otpStore ? [...global.otpStore.keys()] : [],
      rawPhone: raw,
      normalizedPhone: phone,
    };
    return res.status(404).json({ error: 'No OTP found or expired', debug });
  }
  res.json({ otp: stored.otp });
});

/**
 * GET /api/v1/debug/user-role
 * Debug endpoint to check current user role from token and database
 */
router.get('/user-role', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    const decoded = jwt.decode(token); // Decode without verification for debugging
    
    const dbUser = await pool.query(
      'SELECT id, phone, role FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      token_role: decoded?.role,
      token_user_id: decoded?.userId,
      database_role: dbUser.rows[0]?.role,
      database_user_id: dbUser.rows[0]?.id,
      req_user_role: req.user.role,
      req_user_id: req.user.id,
      match: decoded?.role === dbUser.rows[0]?.role,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
