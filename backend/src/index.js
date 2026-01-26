import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { connectRedis } from './config/redis.js';
import pool from './config/database.js';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

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
  // Start HTTP server first (don't wait for DB/Redis)
  app.listen(PORT, () => {
    console.log(`🚀 KHIDMA Backend API running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server running on ws://localhost:${WS_PORT}`);
  });

  // Start WebSocket server
  server.listen(WS_PORT, () => {
    console.log(`🔌 WebSocket server ready on port ${WS_PORT}`);
  });

  // Try to connect to services in background (non-blocking)
  setTimeout(async () => {
    // Test database connection (optional - will fail gracefully)
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connection verified');
    } catch (dbError) {
      console.warn('⚠️  Database connection failed (some features may not work):', dbError.message);
      console.warn('   Make sure PostgreSQL is running on localhost:5432');
      console.warn('   Auth endpoints will work with in-memory fallback');
    }
    
    // Connect Redis (optional - will use in-memory fallback)
    try {
      await connectRedis();
    } catch (redisError) {
      console.warn('⚠️  Redis connection failed (using in-memory fallback for OTP):', redisError.message);
      console.warn('   Make sure Redis is running on localhost:6379');
      console.warn('   OTP will work but will be lost on server restart');
    }
  }, 100);
};

// Start the application
initializeServices();
