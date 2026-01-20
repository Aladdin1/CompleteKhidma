/**
 * Pagination middleware
 * Extracts pagination parameters from query string
 * OpenAPI spec: limit, cursor
 */
export const pagination = (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
  const cursor = req.query.cursor || null;

  req.pagination = {
    limit,
    cursor
  };

  next();
};

/**
 * Format paginated response
 */
export const formatPaginatedResponse = (items, nextCursor = null) => {
  return {
    items,
    next_cursor: nextCursor
  };
};
