import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: false, // Don't auto-reconnect in dev
  }
});

let redisConnected = false;

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
  redisConnected = false;
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
  redisConnected = true;
});

// Connect function - call this during app initialization
export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 2000))
      ]);
      redisConnected = true;
      console.log('✅ Redis connected');
    }
  } catch (error) {
    console.warn('⚠️  Redis connection failed (using in-memory fallback):', error.message);
    redisConnected = false;
  }
};

// Helper to check if Redis is available
export const isRedisAvailable = () => redisConnected && redisClient.isOpen;

export default redisClient;
