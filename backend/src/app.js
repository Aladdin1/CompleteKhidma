/**
 * Express application (no server listen).
 * Used by index.js for production and by tests via Supertest.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './api/routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { pagination } from './middleware/pagination.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pagination);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'khidma-backend', timestamp: new Date().toISOString() });
});

// Serve uploaded media files (must match media upload path: cwd/public/media)
app.use('/media', express.static(path.join(process.cwd(), 'public', 'media')));

app.use('/api/v1', apiRoutes);

app.get('/api/v1', (req, res) => {
  res.json({
    message: 'KHIDMA API v1',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      taskers: '/api/v1/taskers',
      tasks: '/api/v1/tasks',
      bookings: '/api/v1/bookings',
      conversations: '/api/v1/conversations',
      payments: '/api/v1/payments',
      reviews: '/api/v1/reviews',
      admin: '/api/v1/admin',
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
