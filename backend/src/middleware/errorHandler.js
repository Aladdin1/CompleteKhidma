/**
 * Error handling middleware
 * Formats errors according to OpenAPI error model
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

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
