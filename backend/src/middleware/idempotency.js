import redisClient from '../config/redis.js';

/**
 * Idempotency middleware
 * Ensures mutation endpoints can be safely retried
 * Stores response for idempotency key for 24 hours
 */
export const idempotency = async (req, res, next) => {
  // Only apply to mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for this endpoint'
      }
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be a valid UUID'
      }
    });
  }

  try {
    // Check if we've seen this key before (only if Redis is available)
    if (redisClient.isOpen) {
      try {
        const cachedResponse = await Promise.race([
          redisClient.get(`idempotency:${idempotencyKey}`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
        ]);
        
        if (cachedResponse) {
          const { statusCode, body } = JSON.parse(cachedResponse);
          return res.status(statusCode).json(body);
        }
      } catch (redisError) {
        // Redis not available or timeout - continue without idempotency check
        console.warn('Idempotency check skipped (Redis unavailable):', redisError.message);
      }
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to cache response
    res.json = function(body) {
      // Cache successful responses (2xx) only if Redis is available
      if (res.statusCode >= 200 && res.statusCode < 300 && redisClient.isOpen) {
        redisClient.setEx(
          `idempotency:${idempotencyKey}`,
          86400, // 24 hours
          JSON.stringify({ statusCode: res.statusCode, body })
        ).catch((err) => {
          // Silently fail - idempotency caching is optional
          console.warn('Failed to cache idempotency response:', err.message);
        });
      }
      
      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    next(); // Continue on any errors
  }
};
