import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { pagination, formatPaginatedResponse } from '../../middleware/pagination.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/v1/conversations
 * List user's conversations
 */
router.get('/', authenticate, pagination, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    let query = `
      SELECT c.*, b.task_id, b.tasker_id, b.status as booking_status
      FROM conversations c
      LEFT JOIN bookings b ON c.booking_id = b.id
      WHERE EXISTS (
        SELECT 1 FROM bookings WHERE id = c.booking_id 
        AND (tasker_id = $1 OR task_id IN (SELECT id FROM tasks WHERE client_id = $1))
      )
    `;

    const params = [userId];

    if (cursor) {
      query += ` AND c.created_at < (SELECT created_at FROM conversations WHERE id = $2)`;
      params.push(cursor);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const conversations = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? conversations[conversations.length - 1].id : null;

    res.json(formatPaginatedResponse(conversations, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/conversations/by-booking/:booking_id
 * Get conversation by booking ID
 */
router.get('/by-booking/:booking_id', authenticate, async (req, res, next) => {
  try {
    const { booking_id } = req.params;
    const userId = req.user.id;

    // Verify user has access to this booking
    const bookingResult = await pool.query(
      `SELECT b.*, t.client_id 
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)`,
      [booking_id, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found or access denied'
        }
      });
    }

    // Get or create conversation
    let conversationResult = await pool.query(
      'SELECT * FROM conversations WHERE booking_id = $1',
      [booking_id]
    );

    if (conversationResult.rows.length === 0) {
      // Create conversation
      const conversationId = uuidv4();
      await pool.query(
        'INSERT INTO conversations (id, booking_id) VALUES ($1, $2)',
        [conversationId, booking_id]
      );
      conversationResult = await pool.query(
        'SELECT * FROM conversations WHERE id = $1',
        [conversationId]
      );
    }

    res.json(conversationResult.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/conversations/:conversation_id/messages
 * List messages in conversation
 */
router.get('/:conversation_id/messages', authenticate, pagination, async (req, res, next) => {
  try {
    const { conversation_id } = req.params;
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    // Verify access
    const convResult = await pool.query(
      `SELECT c.* FROM conversations c
       JOIN bookings b ON c.booking_id = b.id
       JOIN tasks t ON b.task_id = t.id
       WHERE c.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)`,
      [conversation_id, userId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found or access denied'
        }
      });
    }

    let query = `
      SELECT * FROM messages
      WHERE conversation_id = $1
    `;

    const params = [conversation_id];

    if (cursor) {
      query += ` AND created_at < (SELECT created_at FROM messages WHERE id = $2)`;
      params.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await pool.query(query, params);
    const messages = result.rows.slice(0, limit).reverse(); // Reverse to get chronological order
    const nextCursor = result.rows.length > limit ? messages[messages.length - 1].id : null;

    res.json(formatPaginatedResponse(messages, nextCursor));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/conversations/:conversation_id/messages
 * Send message
 */
router.post('/:conversation_id/messages', authenticate, idempotency, async (req, res, next) => {
  try {
    const { conversation_id } = req.params;
    const userId = req.user.id;
    const { kind, text, media_url } = z.object({
      kind: z.enum(['text', 'voice', 'image', 'video']),
      text: z.string().optional(),
      media_url: z.string().url().optional()
    }).parse(req.body);

    // Verify access
    const convResult = await pool.query(
      `SELECT c.* FROM conversations c
       JOIN bookings b ON c.booking_id = b.id
       JOIN tasks t ON b.task_id = t.id
       WHERE c.id = $1 AND (b.tasker_id = $2 OR t.client_id = $2)`,
      [conversation_id, userId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found or access denied'
        }
      });
    }

    // Validate message content
    if (kind === 'text' && !text) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Text message requires text content'
        }
      });
    }

    if ((kind === 'voice' || kind === 'image' || kind === 'video') && !media_url) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `${kind} message requires media_url`
        }
      });
    }

    const conversation = convResult.rows[0];
    
    // Get booking to find the other participant (recipient)
    const bookingResult = await pool.query(
      `SELECT b.tasker_id, t.client_id, t.category, t.description
       FROM bookings b
       JOIN tasks t ON b.task_id = t.id
       WHERE b.id = $1`,
      [conversation.booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        }
      });
    }

    const booking = bookingResult.rows[0];
    // Determine recipient: if sender is tasker, recipient is client; otherwise recipient is tasker
    const recipientId = userId === booking.tasker_id ? booking.client_id : booking.tasker_id;
    
    // Get sender name for notification
    const senderResult = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId]
    );
    const senderName = senderResult.rows[0]?.full_name || 'Someone';

    const messageId = uuidv4();
    const result = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, kind, text, media_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [messageId, conversation_id, userId, kind, text || null, media_url || null]
    );

    // Create notification for recipient
    if (recipientId) {
      const notificationId = uuidv4();
      const messagePreview = kind === 'text'
        ? (text?.slice(0, 100) || '')
        : kind === 'voice'
          ? 'رسالة صوتية'
          : kind === 'video'
            ? 'فيديو'
            : 'صورة';
      
      await pool.query(
        `INSERT INTO notifications (id, user_id, kind, title, body, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          notificationId,
          recipientId,
          'message_received',
          `رسالة جديدة من ${senderName}`,
          messagePreview,
          JSON.stringify({
            conversation_id: conversation_id,
            message_id: messageId,
            sender_id: userId,
            booking_id: conversation.booking_id
          })
        ]
      );
    }

    // TODO: Send WebSocket notification to other participant
    // TODO: Send push notification

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
