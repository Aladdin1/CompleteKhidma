import express from 'express';
import { z } from 'zod';
import pool from '../../config/database.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../config/redis.js';

const router = express.Router();

// Request OTP schema
const requestOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  locale: z.string().optional().default('ar-EG')
});

// Verify OTP schema
const verifyOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  otp: z.string().length(6),
  device_id: z.string().uuid()
});

/**
 * POST /auth/otp/request
 * Request OTP via SMS
 */
router.post('/otp/request', async (req, res, next) => {
  try {
    const { phone, locale } = requestOTPSchema.parse(req.body);
    
    // TODO: Integrate with SMS provider
    // For now, generate and store OTP in Redis (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${phone}`;
    
    // Store OTP for 10 minutes
    await redisClient.setEx(otpKey, 600, otp);
    
    // TODO: Send SMS via provider
    console.log(`OTP for ${phone}: ${otp} (dev only)`);
    
    res.status(200).json({
      message: 'OTP sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/otp/verify
 * Verify OTP and issue tokens
 */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, otp, device_id } = verifyOTPSchema.parse(req.body);
    
    // Verify OTP
    const otpKey = `otp:${phone}`;
    const storedOTP = await redisClient.get(otpKey);
    
    if (!storedOTP || storedOTP !== otp) {
      return res.status(401).json({
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        }
      });
    }
    
    // Delete OTP after use
    await redisClient.del(otpKey);
    
    // Find or create user
    let userResult = await pool.query(
      'SELECT id, role, phone, email, full_name, locale FROM users WHERE phone = $1',
      [phone]
    );
    
    let user;
    if (userResult.rows.length === 0) {
      // Create new user (default role: client)
      const newUserResult = await pool.query(
        `INSERT INTO users (id, role, phone, locale) 
         VALUES (uuid_generate_v4(), 'client', $1, $2) 
         RETURNING id, role, phone, email, full_name, locale`,
        [phone, req.body.locale || 'ar-EG']
      );
      user = newUserResult.rows[0];
      
      // Mark phone as verified
      await pool.query(
        'INSERT INTO user_verifications (user_id, phone_verified) VALUES ($1, true)',
        [user.id]
      );
    } else {
      user = userResult.rows[0];
    }
    
    // Update/create device
    await pool.query(
      `INSERT INTO user_devices (id, user_id, device_id, platform, last_seen_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, now())
       ON CONFLICT (user_id, device_id) 
       DO UPDATE SET last_seen_at = now()`,
      [user.id, device_id, req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web']
    );
    
    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
    
    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/token/refresh
 * Refresh access token
 */
router.post('/token/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = z.object({
      refresh_token: z.string()
    }).parse(req.body);
    
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }
    
    // Get user
    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.status(200).json({
      access_token: accessToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
    next(error);
  }
});

export default router;
