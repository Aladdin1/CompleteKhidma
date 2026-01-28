import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import taskerRoutes from './taskers.js';
import taskRoutes from './tasks.js';
import bookingRoutes from './bookings.js';
import bidRoutes from './bids.js';
import conversationRoutes from './conversations.js';
import paymentRoutes from './payments.js';
import reviewRoutes from './reviews.js';
import adminRoutes from './admin.js';
import reportRoutes from './reports.js';
import disputeRoutes from './disputes.js';
import categoryRoutes from './categories.js';
import notificationRoutes from './notifications.js';
import webhookRoutes from './webhooks.js';
import mediaRoutes from './media.js';
import debugRoutes from './debug.js';

const router = express.Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/taskers', taskerRoutes);
router.use('/tasks', taskRoutes);
router.use('/bookings', bookingRoutes);
router.use('/bids', bidRoutes);
router.use('/conversations', conversationRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);
router.use('/disputes', disputeRoutes);
// Payouts are mounted under taskers
// router.use('/payouts', payoutRoutes);
router.use('/categories', categoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/media', mediaRoutes);
router.use('/debug', debugRoutes);

export default router;
