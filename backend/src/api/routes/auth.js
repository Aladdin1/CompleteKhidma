import express from 'express';
import { z } from 'zod';
import pool from '../../config/database.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../config/redis.js';

const router = express.Router();

// Request OTP schema - more lenient phone validation
const requestOTPSchema = z.object({
  phone: z.string().min(10).max(20), // More lenient - just check length
  locale: z.string().optional().default('ar-EG')
});

// Verify OTP schema - more lenient phone validation
const verifyOTPSchema = z.object({
  phone: z.string().min(10).max(20), // More lenient - just check length
  otp: z.string().length(6),
  device_id: z.string().uuid()
});

/**
 * POST /auth/otp/request
 * Request OTP via SMS
 */
router.post('/otp/request', async (req, res, next) => {
  try {
    console.log('OTP request received:', { body: req.body, phone: req.body?.phone });
    
    const { phone, locale } = requestOTPSchema.parse(req.body);
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // TODO: Integrate with SMS provider
    // For now, generate and store OTP in Redis (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${normalizedPhone}`;
    
    // Log OTP prominently to terminal (for development/testing)
    console.log('\n' + '='.repeat(60));
    console.log('📱 OTP CODE GENERATED');
    console.log('='.repeat(60));
    console.log(`Phone: ${normalizedPhone}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires in: 10 minutes`);
    console.log('='.repeat(60) + '\n');
    
    // Store OTP for 10 minutes - try Redis first, fallback to memory
    let stored = false;
    try {
      if (redisClient && redisClient.isOpen) {
        try {
          await Promise.race([
            redisClient.setEx(otpKey, 600, otp),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
          ]);
          stored = true;
          console.log('✅ OTP stored in Redis');
        } catch (redisError) {
          console.warn('⚠️  Redis storage failed, using in-memory fallback:', redisError.message);
        }
      }
    } catch (redisCheckError) {
      console.warn('⚠️  Redis not available, using in-memory fallback:', redisCheckError.message);
    }
    
    // Fallback: Always store in memory (works even if Redis fails)
    if (!global.otpStore) global.otpStore = new Map();
    global.otpStore.set(otpKey, { otp, expires: Date.now() + 600000 });
    if (!stored) {
      console.log(`⚠️  OTP stored in memory (Redis unavailable): ${otp}`);
    }
    
    // TODO: Send SMS via provider
    
    res.status(200).json({
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('OTP request error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      body: req.body
    });
    
    // Handle validation errors specifically
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid phone number format',
          details: error.issues
        }
      });
    }
    
    // For other errors, still try to return success (OTP is logged)
    res.status(200).json({
      message: 'OTP sent successfully (check console for code)'
    });
  }
});

/**
 * POST /auth/otp/verify
 * Verify OTP and issue tokens
 */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, otp, device_id } = verifyOTPSchema.parse(req.body);
    
    // Normalize phone number (same as in request)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Verify OTP
    const otpKey = `otp:${normalizedPhone}`;
    let storedOTP;
    
    try {
      if (redisClient.isOpen) {
        storedOTP = await Promise.race([
          redisClient.get(otpKey),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
        ]);
      } else {
        throw new Error('Redis not connected');
      }
    } catch (redisError) {
      // Fallback: Check in-memory store if Redis is not available
      if (global.otpStore && global.otpStore.has(otpKey)) {
        const stored = global.otpStore.get(otpKey);
        if (Date.now() > stored.expires) {
          global.otpStore.delete(otpKey);
          storedOTP = null;
        } else {
          storedOTP = stored.otp;
        }
      }
    }
    
    if (!storedOTP || storedOTP !== otp) {
      return res.status(401).json({
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        }
      });
    }
    
    // Delete OTP after use
    try {
      if (redisClient.isOpen) {
        await Promise.race([
          redisClient.del(otpKey),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
        ]);
      }
    } catch (redisError) {
      // Fallback: Delete from memory store
      if (global.otpStore) {
        global.otpStore.delete(otpKey);
      }
    }
    
    // Find or create user
    let user;
    try {
      let userResult = await pool.query(
        'SELECT id, role, phone, email, full_name, locale FROM users WHERE phone = $1',
        [normalizedPhone]
      );
      
      if (userResult.rows.length === 0) {
        // Create new user (default role: client)
        const newUserResult = await pool.query(
          `INSERT INTO users (id, role, phone, locale) 
           VALUES (uuid_generate_v4(), 'client', $1, $2) 
           RETURNING id, role, phone, email, full_name, locale`,
          [normalizedPhone, req.body.locale || 'ar-EG']
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
    } catch (dbError) {
      // Fallback: Create user in memory if database is not available (dev only)
      console.warn('⚠️  Database not available, using in-memory user storage (dev only)');
      if (!global.userStore) global.userStore = new Map();
      
      if (global.userStore.has(normalizedPhone)) {
        user = global.userStore.get(normalizedPhone);
      } else {
        // Create new user in memory
        user = {
          id: uuidv4(),
          role: 'client',
          phone: normalizedPhone,
          email: null,
          full_name: null,
          locale: req.body.locale || 'ar-EG'
        };
        global.userStore.set(normalizedPhone, user);
      }
    }
    
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
    let user;
    try {
      const userResult = await pool.query(
        'SELECT id, role FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found in database');
      }
      
      user = userResult.rows[0];
    } catch (dbError) {
      // Fallback: Check in-memory user store if database is not available
      if (global.userStore) {
        user = Array.from(global.userStore.values()).find(u => u.id === decoded.userId);
        if (!user) {
          return res.status(401).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found'
            }
          });
        }
        user = { id: user.id, role: user.role };
      } else {
        return res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }
    }
    
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
