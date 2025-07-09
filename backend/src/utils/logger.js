/**
 * Logger configuration using Winston
 * Provides structured logging with different levels and formats
 */
import winston from 'winston';
import { config } from '../config/environment.js';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'ai-messaging-backend' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: config.isDevelopment ? consoleFormat : logFormat
    })
  ],
  // Don't exit on handled exceptions
  exitOnError: false
});

// Add file transport for production
if (config.isProduction) {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Optimization metrics tracking (Phase 5)
 */
const optimizationMetrics = {
  firebaseOperations: {
    reads: 0,
    writes: 0,
    batched: 0,
    cached: 0,
    fallback: 0
  },
  bufferMetrics: {
    messagesBatched: 0,
    statsBuffered: 0,
    writeBehindQueued: 0,
    contextCacheHits: 0,
    contextCacheMisses: 0
  },
  performance: {
    avgBatchSize: 0,
    avgFlushTime: 0,
    totalSaved: 0,
    flushCount: 0
  },
  startTime: Date.now()
};

/**
 * Log Firebase operation with metrics
 * @param {string} operation - Operation type (read/write/batch)
 * @param {Object} details - Operation details
 */
logger.firebaseOp = function(operation, details = {}) {
  switch (operation) {
    case 'read':
      optimizationMetrics.firebaseOperations.reads++;
      break;
    case 'write':
      optimizationMetrics.firebaseOperations.writes++;
      break;
    case 'batch':
      optimizationMetrics.firebaseOperations.batched += details.count || 1;
      break;
    case 'cached':
      optimizationMetrics.firebaseOperations.cached++;
      break;
    case 'fallback':
      optimizationMetrics.firebaseOperations.fallback++;
      break;
  }
  
  this.debug(`Firebase ${operation}`, {
    ...details,
    metrics: {
      total: optimizationMetrics.firebaseOperations.reads + 
             optimizationMetrics.firebaseOperations.writes,
      saved: optimizationMetrics.firebaseOperations.cached + 
             optimizationMetrics.firebaseOperations.batched
    }
  });
};

/**
 * Log buffer operation with metrics
 * @param {string} bufferType - Buffer type (message/stats/writeBehind/context)
 * @param {Object} details - Operation details
 */
logger.bufferOp = function(bufferType, details = {}) {
  switch (bufferType) {
    case 'message':
      optimizationMetrics.bufferMetrics.messagesBatched++;
      break;
    case 'stats':
      optimizationMetrics.bufferMetrics.statsBuffered++;
      break;
    case 'writeBehind':
      optimizationMetrics.bufferMetrics.writeBehindQueued++;
      break;
    case 'contextHit':
      optimizationMetrics.bufferMetrics.contextCacheHits++;
      break;
    case 'contextMiss':
      optimizationMetrics.bufferMetrics.contextCacheMisses++;
      break;
  }
  
  this.debug(`Buffer operation: ${bufferType}`, {
    ...details,
    totalBuffered: optimizationMetrics.bufferMetrics.messagesBatched +
                   optimizationMetrics.bufferMetrics.statsBuffered +
                   optimizationMetrics.bufferMetrics.writeBehindQueued
  });
};

/**
 * Log performance metric
 * @param {string} metric - Metric type
 * @param {number} value - Metric value
 */
logger.perfMetric = function(metric, value) {
  if (metric === 'batchSize') {
    // Calculate running average
    const currentAvg = optimizationMetrics.performance.avgBatchSize;
    const count = optimizationMetrics.performance.flushCount;
    optimizationMetrics.performance.avgBatchSize = 
      count === 0 ? value : (currentAvg * count + value) / (count + 1);
  } else if (metric === 'flushTime') {
    // Calculate running average
    const currentAvg = optimizationMetrics.performance.avgFlushTime;
    const count = optimizationMetrics.performance.flushCount;
    optimizationMetrics.performance.avgFlushTime = 
      count === 0 ? value : (currentAvg * count + value) / (count + 1);
    // Increment flush count after calculating averages
    optimizationMetrics.performance.flushCount++;
  } else if (metric === 'totalSaved') {
    optimizationMetrics.performance.totalSaved += value;
  }
  
  this.debug(`Performance metric: ${metric}`, {
    value,
    metrics: optimizationMetrics.performance
  });
};

/**
 * Get optimization metrics summary
 * @returns {Object} Metrics summary
 */
logger.getOptimizationMetrics = function() {
  const uptime = Date.now() - optimizationMetrics.startTime;
  const totalOps = optimizationMetrics.firebaseOperations.reads + 
                   optimizationMetrics.firebaseOperations.writes +
                   optimizationMetrics.firebaseOperations.batched +
                   optimizationMetrics.firebaseOperations.cached +
                   optimizationMetrics.firebaseOperations.fallback;
  const savedOps = optimizationMetrics.firebaseOperations.cached + 
                   optimizationMetrics.firebaseOperations.batched;
  
  return {
    uptime,
    firebase: {
      ...optimizationMetrics.firebaseOperations,
      totalOperations: totalOps,
      savedOperations: savedOps,
      savingsRate: totalOps > 0 ? (savedOps / totalOps * 100).toFixed(2) + '%' : '0%'
    },
    buffers: {
      ...optimizationMetrics.bufferMetrics,
      cacheHitRate: optimizationMetrics.bufferMetrics.contextCacheHits > 0 ?
        (optimizationMetrics.bufferMetrics.contextCacheHits / 
         (optimizationMetrics.bufferMetrics.contextCacheHits + 
          optimizationMetrics.bufferMetrics.contextCacheMisses) * 100).toFixed(2) + '%' : '0%'
    },
    performance: optimizationMetrics.performance,
    estimatedCostSavings: {
      firebaseReads: savedOps * 0.00003, // Estimated cost per read
      firebaseWrites: savedOps * 0.00018, // Estimated cost per write
      total: savedOps * 0.00021
    }
  };
};

/**
 * Reset optimization metrics
 */
logger.resetOptimizationMetrics = function() {
  Object.keys(optimizationMetrics.firebaseOperations).forEach(key => {
    optimizationMetrics.firebaseOperations[key] = 0;
  });
  Object.keys(optimizationMetrics.bufferMetrics).forEach(key => {
    optimizationMetrics.bufferMetrics[key] = 0;
  });
  Object.keys(optimizationMetrics.performance).forEach(key => {
    optimizationMetrics.performance[key] = 0;
  });
  optimizationMetrics.startTime = Date.now();
  
  this.info('Optimization metrics reset');
};

export default logger; 