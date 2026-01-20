import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/reports
 * Create a report
 */
router.post('/', authenticate, idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reported_user_id, booking_id, kind, description } = z.object({
      reported_user_id: z.string().uuid().optional(),
      booking_id: z.string().uuid().optional(),
      kind: z.enum(['harassment', 'fraud', 'safety', 'property_damage', 'other']),
      description: z.string()
    }).parse(req.body);

    if (!reported_user_id && !booking_id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either reported_user_id or booking_id must be provided'
        }
      });
    }

    const reportId = uuidv4();
    const result = await pool.query(
      `INSERT INTO reports (id, reporter_id, reported_user_id, booking_id, kind, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reportId, userId, reported_user_id || null, booking_id || null, kind, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reports/me
 * Get my reports
 */
router.get('/me', authenticate, pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    let query = 'SELECT * FROM reports WHERE reporter_id = $1';
    const params = [userId];

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM reports WHERE id = $2)`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const reports = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? reports[reports.length - 1].id : null;

    res.json(formatPaginatedResponse(reports, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reports/:report_id
 * Get report details
 */
router.get('/:report_id', authenticate, async (req, res, next) => {
  try {
    const { report_id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND reporter_id = $2',
      [report_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
