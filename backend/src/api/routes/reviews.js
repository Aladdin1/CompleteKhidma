import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/reviews
 * Create review
 */
router.post('/', authenticate, idempotency, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { booking_id, rating, tags, comment } = z.object({
      booking_id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      tags: z.array(z.string()).optional(),
      comment: z.string().optional()
    }).parse(req.body);

    // Verify booking access and that user participated
    const bookingResult = await pool.query(
      `SELECT b.*, t.client_id
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)
       AND b.status = 'completed'`,
      [booking_id, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found or not completed'
        }
      });
    }

    const booking = bookingResult.rows[0];

    // Check if review already exists for this user
    const existingReview = await pool.query(
      'SELECT * FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
      [booking_id, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'REVIEW_EXISTS',
          message: 'Review already exists for this booking'
        }
      });
    }

    // Determine reviewee (the other party)
    const revieweeId = booking.client_id === userId ? booking.tasker_id : booking.client_id;

    const reviewId = uuidv4();
    await pool.query(
      `INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, tags, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        reviewId,
        booking_id,
        userId,
        revieweeId,
        rating,
        tags || [],
        comment || null
      ]
    );

    // Update tasker rating (simplified - in production, use more sophisticated calculation)
    if (revieweeId === booking.tasker_id) {
      const ratingResult = await pool.query(
        `SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as count
         FROM reviews WHERE reviewee_id = $1`,
        [revieweeId]
      );

      await pool.query(
        `UPDATE tasker_profiles 
         SET rating_avg = $1, rating_count = $2, updated_at = now()
         WHERE user_id = $3`,
        [
          parseFloat(ratingResult.rows[0].avg_rating),
          parseInt(ratingResult.rows[0].count),
          revieweeId
        ]
      );
    }

    // Update task state to reviewed if both parties reviewed
    const reviewCount = await pool.query(
      'SELECT COUNT(*) as count FROM reviews WHERE booking_id = $1',
      [booking_id]
    );

    if (parseInt(reviewCount.rows[0].count) >= 2) {
      await pool.query(
        'UPDATE tasks SET state = $1, updated_at = now() WHERE id = $2',
        ['reviewed', booking.task_id]
      );
    }

    res.status(201).json({
      id: reviewId,
      booking_id: booking_id,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating: rating,
      tags: tags || [],
      comment: comment || null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
