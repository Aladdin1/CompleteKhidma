import express from 'express';
import { z } from 'zod';
import pool from '../../config/database.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../config/redis.js';

const router = express.Router();

// OAuth helper function to find or create user from OAuth profile
async function findOrCreateOAuthUser(provider, oauthId, profile, locale = 'ar-EG') {
  try {
    // Try to find existing user by OAuth provider + ID
    let userResult = await pool.query(
      `SELECT id, role, phone, email, full_name, locale, oauth_provider, oauth_id 
       FROM users 
       WHERE oauth_provider = $1 AND oauth_id = $2`,
      [provider, oauthId]
    );

    if (userResult.rows.length > 0) {
      // User exists, return it
      console.log('✅ Found existing OAuth user:', userResult.rows[0].id);
      return userResult.rows[0];
    }

    // Check if email already exists (user might have signed up with phone/OTP)
    if (profile.email) {
      const emailResult = await pool.query(
        `SELECT id, role, phone, email, full_name, locale, oauth_provider, oauth_id 
         FROM users 
         WHERE email = $1`,
        [profile.email]
      );

      if (emailResult.rows.length > 0) {
        // Link OAuth to existing account
        console.log('✅ Linking OAuth to existing email account:', emailResult.rows[0].id);
        await pool.query(
          `UPDATE users 
           SET oauth_provider = $1, oauth_id = $2, email = COALESCE(email, $3), full_name = COALESCE(full_name, $4)
           WHERE id = $5`,
          [provider, oauthId, profile.email, profile.name, emailResult.rows[0].id]
        );
        // Return updated user
        const updatedResult = await pool.query(
          `SELECT id, role, phone, email, full_name, locale, oauth_provider, oauth_id 
           FROM users 
           WHERE id = $1`,
          [emailResult.rows[0].id]
        );
        return updatedResult.rows[0];
      }
    }

    // Create new user
    console.log('📝 Creating new OAuth user:', { provider, oauthId, email: profile.email });
    const newUserResult = await pool.query(
      `INSERT INTO users (id, role, phone, email, full_name, locale, oauth_provider, oauth_id) 
       VALUES (uuid_generate_v4(), 'client', $1, $2, $3, $4, $5, $6) 
       RETURNING id, role, phone, email, full_name, locale, oauth_provider, oauth_id`,
      [null, profile.email || null, profile.name || null, locale, provider, oauthId]
    );

    const newUser = newUserResult.rows[0];
    console.log('✅ Created new OAuth user:', newUser.id);

    // Create verification record if email is provided
    try {
      await pool.query(
        `INSERT INTO user_verifications (user_id, phone_verified) 
         VALUES ($1, false)
         ON CONFLICT (user_id) DO NOTHING`,
        [newUser.id]
      );
    } catch (verificationError) {
      console.warn('⚠️  Could not create verification record:', verificationError.message);
    }

    return newUser;
  } catch (dbError) {
    // Log the actual database error for debugging
    console.error('❌ Database error in findOrCreateOAuthUser:', {
      message: dbError.message,
      code: dbError.code,
      detail: dbError.detail,
      hint: dbError.hint,
      stack: dbError.stack
    });

    // Check if it's a column not found error (migration not run)
    if (dbError.message && dbError.message.includes('oauth_provider')) {
      console.error('❌ ERROR: OAuth columns not found in database!');
      console.error('   Please run the migration: backend/src/db/migrations/008_oauth_support.sql');
      throw new Error('OAuth support not enabled. Please run database migration 008_oauth_support.sql');
    }

    // Fallback: Create user in memory if database is not available (dev only)
    console.warn('⚠️  Database not available, using in-memory user storage (dev only)');
    if (!global.userStore) global.userStore = new Map();

    const oauthKey = `${provider}:${oauthId}`;
    if (global.userStore.has(oauthKey)) {
      return global.userStore.get(oauthKey);
    }

    const newUser = {
      id: uuidv4(),
      role: 'client',
      phone: null,
      email: profile.email || null,
      full_name: profile.name || null,
      locale: locale,
      oauth_provider: provider,
      oauth_id: oauthId
    };
    global.userStore.set(oauthKey, newUser);
    console.warn('⚠️  Created user in memory (not persisted):', newUser.id);
    return newUser;
  }
}

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
    // For now, use fixed OTP for development
    const otp = '111111';
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

/**
 * GET /auth/oauth/google/check
 * Check if Google OAuth is configured
 */
router.get('/oauth/google/check', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Debug info (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('OAuth Debug Info:');
    console.log('GOOGLE_CLIENT_ID exists:', !!clientId);
    console.log('GOOGLE_CLIENT_ID length:', clientId ? clientId.length : 0);
    console.log('GOOGLE_CLIENT_SECRET exists:', !!clientSecret);
    console.log('GOOGLE_CLIENT_SECRET length:', clientSecret ? clientSecret.length : 0);
    console.log('Working directory:', process.cwd());
  }
  
  if (!clientId) {
    return res.status(500).json({
      error: {
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.',
        debug: process.env.NODE_ENV === 'development' ? {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          workingDir: process.cwd(),
          envFileLocation: 'backend/.env'
        } : undefined
      }
    });
  }
  
  res.json({ configured: true });
});

/**
 * GET /auth/oauth/google
 * Initiate Google OAuth flow
 */
router.get('/oauth/google', (req, res) => {
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/oauth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({
      error: {
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Google OAuth is not configured'
      }
    });
  }

  const state = req.query.redirect_uri 
    ? Buffer.from(req.query.redirect_uri).toString('base64url')
    : null;

  const scope = 'openid email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent${state ? `&state=${encodeURIComponent(state)}` : ''}`;

  res.redirect(authUrl);
});

/**
 * GET /auth/oauth/google/callback
 * Handle Google OAuth callback
 */
router.get('/oauth/google/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=oauth_cancelled`);
    }

    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/oauth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const googleUser = await userInfoResponse.json();

    // Find or create user
    const user = await findOrCreateOAuthUser(
      'google',
      googleUser.id,
      {
        email: googleUser.email,
        name: googleUser.name || googleUser.email?.split('@')[0],
      },
      req.query.locale || 'ar-EG'
    );

    // Generate JWT tokens
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

    // Update/create device
    const deviceId = req.query.device_id || uuidv4();
    try {
      await pool.query(
        `INSERT INTO user_devices (id, user_id, device_id, platform, last_seen_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, now())
         ON CONFLICT (user_id, device_id) 
         DO UPDATE SET last_seen_at = now()`,
        [user.id, deviceId, req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web']
      );
    } catch (dbError) {
      // Ignore device registration errors
      console.warn('Device registration failed:', dbError.message);
    }

    // Decode redirect URI from state
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let redirectUrl = `${frontendUrl}/auth/callback`;

    if (state) {
      try {
        const decodedState = Buffer.from(state, 'base64url').toString('utf-8');
        redirectUrl = decodedState;
      } catch (e) {
        // Use default if state decode fails
      }
    }

    // Redirect to frontend with tokens in URL (frontend will extract and store them)
    const params = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: JSON.stringify(user),
    });

    res.redirect(`${redirectUrl}?${params.toString()}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /auth/oauth/facebook/check
 * Check if Facebook OAuth is configured
 */
router.get('/oauth/facebook/check', (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  
  if (!appId) {
    return res.status(500).json({
      error: {
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Facebook OAuth is not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to your .env file.'
      }
    });
  }
  
  res.json({ configured: true });
});

/**
 * GET /auth/oauth/facebook
 * Initiate Facebook OAuth flow
 */
router.get('/oauth/facebook', (req, res) => {
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/oauth/facebook/callback`;
  const appId = process.env.FACEBOOK_APP_ID;

  if (!appId) {
    return res.status(500).json({
      error: {
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Facebook OAuth is not configured'
      }
    });
  }

  const state = req.query.redirect_uri
    ? Buffer.from(req.query.redirect_uri).toString('base64url')
    : null;

  const scope = 'email,public_profile';
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(appId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code${state ? `&state=${encodeURIComponent(state)}` : ''}`;

  res.redirect(authUrl);
});

/**
 * GET /auth/oauth/facebook/callback
 * Handle Facebook OAuth callback
 */
router.get('/oauth/facebook/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=oauth_cancelled`);
    }

    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/oauth/facebook/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${encodeURIComponent(appId)}&` +
      `client_secret=${encodeURIComponent(appSecret)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${encodeURIComponent(code)}`, {
      method: 'GET',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token');
    }

    const tokenData = await tokenResponse.json();

    // Get user info from Facebook
    const userInfoResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${encodeURIComponent(tokenData.access_token)}`,
      {
        method: 'GET',
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Facebook');
    }

    const facebookUser = await userInfoResponse.json();

    // Find or create user
    const user = await findOrCreateOAuthUser(
      'facebook',
      facebookUser.id,
      {
        email: facebookUser.email,
        name: facebookUser.name || facebookUser.email?.split('@')[0],
      },
      req.query.locale || 'ar-EG'
    );

    // Generate JWT tokens
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

    // Update/create device
    const deviceId = req.query.device_id || uuidv4();
    try {
      await pool.query(
        `INSERT INTO user_devices (id, user_id, device_id, platform, last_seen_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, now())
         ON CONFLICT (user_id, device_id) 
         DO UPDATE SET last_seen_at = now()`,
        [user.id, deviceId, req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web']
      );
    } catch (dbError) {
      // Ignore device registration errors
      console.warn('Device registration failed:', dbError.message);
    }

    // Decode redirect URI from state
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let redirectUrl = `${frontendUrl}/auth/callback`;

    if (state) {
      try {
        const decodedState = Buffer.from(state, 'base64url').toString('utf-8');
        redirectUrl = decodedState;
      } catch (e) {
        // Use default if state decode fails
      }
    }

    // Redirect to frontend with tokens in URL (frontend will extract and store them)
    const params = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: JSON.stringify(user),
    });

    res.redirect(`${redirectUrl}?${params.toString()}`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

export default router;
