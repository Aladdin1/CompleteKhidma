import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        }
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database (always get latest role from DB, not from token)
    try {
      const result = await pool.query(
        'SELECT id, role, phone, email, full_name, locale, account_status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found in database');
      }

      const user = result.rows[0];
      // US-A-006: Block suspended or banned users from all API access (account_status may be absent pre-migration)
      const status = user.account_status;
      if (status === 'suspended') {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended. Please contact support.'
          }
        });
      }
      if (status === 'banned') {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_BANNED',
            message: 'Your account has been banned.'
          }
        });
      }
      req.user = user;
      
      // Log for debugging (can remove in production)
      if (process.env.NODE_ENV === 'development' && decoded.role !== req.user.role) {
        console.log(`⚠️  Role mismatch: Token has '${decoded.role}' but DB has '${req.user.role}' for user ${decoded.userId}`);
      }
      
      return next();
    } catch (dbError) {
      // Fallback: Check in-memory user store if database is not available
      if (global.userStore) {
        const user = Array.from(global.userStore.values()).find(u => u.id === decoded.userId);
        if (user) {
          req.user = {
            id: user.id,
            role: user.role,
            phone: user.phone,
            email: user.email,
            full_name: user.full_name,
            locale: user.locale
          };
          return next();
        }
      }
      
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found'
        }
      });
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    }
    
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        try {
          const result = await pool.query(
            'SELECT id, role, phone, email, full_name, locale, account_status FROM users WHERE id = $1',
            [decoded.userId]
          );

          if (result.rows.length > 0) {
            const u = result.rows[0];
            if (u.account_status !== 'suspended' && u.account_status !== 'banned') {
              req.user = u;
            }
          }
        } catch (dbError) {
          // Fallback: Check in-memory user store
          if (global.userStore) {
            const user = Array.from(global.userStore.values()).find(u => u.id === decoded.userId);
            if (user) {
              req.user = {
                id: user.id,
                role: user.role,
                phone: user.phone,
                email: user.email,
                full_name: user.full_name,
                locale: user.locale
              };
            }
          }
        }
      } catch (jwtError) {
        // Ignore JWT errors for optional auth
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 * Special rule: Taskers can also access client endpoints (since they can post tasks too)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const userRole = req.user.role;
    const allowedRoles = [...roles];
    
    // Special rule: taskers can access client endpoints
    // This allows taskers to post tasks and use client features
    if (userRole === 'tasker' && roles.includes('client')) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      // Enhanced error message with debugging info
      const errorMsg = `Insufficient permissions. Your current role is '${userRole}', but this endpoint requires: ${roles.join(' or ')}. Please ensure your role is correctly set in the database and logout/login to get a new token.`;
      console.log(`⚠️  Access denied: User ${req.user.id} (${req.user.phone}) has role '${userRole}', required: ${roles.join(', ')}`);
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: errorMsg,
          current_role: userRole,
          required_roles: roles,
          user_id: req.user.id
        }
      });
    }

    next();
  };
};

/**
 * Admin area: allow admin/ops for all routes; allow customer_service for support-tickets and user lookup only.
 * Customer service can: handle tickets, look up client/tasker profile, create support ticket for a user.
 */
export const requireAdminOrSupportRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }
  const userRole = req.user.role;
  const isSupportTicketPath = req.path.startsWith('/support-tickets');
  // Customer service may list users and view user profile (read-only) to create tickets
  const isUserLookupPath = req.method === 'GET' && (
    req.path === '/users' ||
    /^\/users\/[^/]+$/.test(req.path) ||
    /^\/users\/[^/]+\/tasks$/.test(req.path)
  );
  // Customer service may view task list and task details/history (read-only) when linked from a ticket
  const isTaskReadPath = req.method === 'GET' && (
    req.path === '/tasks' ||
    req.path.startsWith('/tasks/') ||
    (req.originalUrl && req.originalUrl.includes('/admin/tasks'))
  );
  const allowedForSupport = ['admin', 'ops', 'customer_service'];
  const allowedForRest = ['admin', 'ops'];
  const allowed = (isSupportTicketPath || isUserLookupPath || isTaskReadPath) ? allowedForSupport : allowedForRest;
  if (!allowed.includes(userRole)) {
    const msg = (isSupportTicketPath || isUserLookupPath || isTaskReadPath)
      ? `This area requires: ${allowedForSupport.join(' or ')}.`
      : `This admin area requires: ${allowedForRest.join(' or ')}. Customer service can only access Support tickets and user lookup.`;
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: msg,
        current_role: userRole,
        required_roles: allowed
      }
    });
  }
  next();
};

/**
 * Restrict to platform admin only (role === 'admin').
 * Use for user-management endpoints (suspend, ban, etc.); ops can use operational endpoints only.
 */
export const requireAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'This action requires platform admin role. Ops can use tasks, metrics, and disputes only.',
        current_role: req.user.role,
        required_role: 'admin'
      }
    });
  }
  next();
};
