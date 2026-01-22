/**
 * Error handling middleware
 * Formats errors according to OpenAPI error model
 */
export const errorHandler = (err, req, res, next) => {
  // Safely log error without circular reference issues
  try {
    console.error('Error:', {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
      stack: err?.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    });
  } catch (logError) {
    console.error('Error occurred (could not log details):', err?.message || String(err));
  }

  // Validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Validation failed',
        details: err.errors || err.issues
      }
    });
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect')) {
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database service is not available',
        details: {
          hint: 'Please ensure PostgreSQL is running',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        }
      }
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists',
        details: { constraint: err.constraint }
      }
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
        details: { constraint: err.constraint }
      }
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : message,
      details: process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }
    }
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
};
