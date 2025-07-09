/**
 * Simple Health check routes
 * Basic server status monitoring
 */
import { Router } from 'express';
import { getFirebaseFirestore } from '../config/firebase.js';
import { isServiceAvailable } from '../services/deepseekService.js';
import { getQueueStats } from '../queues/messageQueue.js';
import { getRedisClient, isRedisConnected } from '../config/redis.js';
import { getBatchWriteHealth } from '../workers/batchWriteWorker.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Readiness check
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = {
      firebase: false,
      deepseek: false,
      redis: false,
      queue: false
    };
    
    // Check Firebase
    try {
      const db = getFirebaseFirestore();
      if (db) {
        checks.firebase = true;
      }
    } catch (error) {
      logger.error('Firebase health check failed:', error);
    }
    
    // Check DeepSeek
    checks.deepseek = isServiceAvailable();
    
    // Check Redis
    try {
      checks.redis = isRedisConnected();
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }
    
    // Check Queue
    try {
      const stats = await getQueueStats();
      checks.queue = true;
    } catch (error) {
      logger.error('Queue health check failed:', error);
    }
    
    const allHealthy = Object.values(checks).every(check => check === true);
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? 'All services ready' : 'Some services unavailable',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Readiness check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness check
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is alive',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

/**
 * Queue statistics
 * GET /health/queue
 */
router.get('/queue', async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    res.status(200).json({
      success: true,
      message: 'Queue statistics',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Queue stats check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Batch write health check
 * GET /health/batch-write
 */
router.get('/batch-write', async (req, res) => {
  try {
    const health = await getBatchWriteHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get batch write health' });
  }
});

export default router;