/**
 * Simple Express app configuration
 * Basic middleware, routes, and error handling
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import characterRoutes from './routes/characters.js';
import conversationRoutes from './routes/conversations.js';

/**
 * Create and configure Express app
 * @returns {Express} Configured Express app
 */
export const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  app.use(cors(corsOptions));
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    next();
  });

  // Trust proxy
  app.set('trust proxy', 1);

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/characters', characterRoutes);
  app.use('/api/conversations', conversationRoutes);

  // API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Simple AI Messaging Platform API',
      version: '1.0.0',
      endpoints: {
        health: {
          base: '/health',
          ready: '/health/ready',
          live: '/health/live'
        },
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          profile: 'GET /api/auth/me'
        },
        users: {
          getById: 'GET /api/users/:uid',
          getByUsername: 'GET /api/users/username/:username'
        },
        characters: {
          list: 'GET /api/characters',
          getById: 'GET /api/characters/:id',
          create: 'POST /api/characters',
          update: 'PUT /api/characters/:id',
          delete: 'DELETE /api/characters/:id'
        },
        conversations: {
          list: 'GET /api/conversations',
          create: 'POST /api/conversations',
          messages: 'GET /api/conversations/:conversationId/messages',
          delete: 'DELETE /api/conversations/:conversationId'
        }
      }
    });
  });

  // 404 handler
  app.use(notFound);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;