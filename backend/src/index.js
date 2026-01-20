import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { connectRedis } from './config/redis.js';
import pool from './config/database.js';
import apiRoutes from './api/routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { pagination } from './middleware/pagination.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pagination);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'khidma-backend', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', apiRoutes);

// API info endpoint
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
      admin: '/api/v1/admin'
    }
  });
});

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket Server for real-time messaging
const server = createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    // Echo for now - will implement proper message handling
    ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection verified');
    
    // Connect Redis
    await connectRedis();
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 KHIDMA Backend API running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket server running on ws://localhost:${WS_PORT}`);
    });

    // Start WebSocket server
    server.listen(WS_PORT, () => {
      console.log(`🔌 WebSocket server ready on port ${WS_PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start the application
initializeServices();
