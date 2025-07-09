/**
 * API Integration Tests
 * Basic tests to verify endpoints are working
 */
import request from 'supertest';
import { createApp } from '../../app.js';

describe('API Integration', () => {
  let app;
  
  beforeAll(() => {
    app = createApp();
  });
  
  describe('Health Endpoints', () => {
    it('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is running');
      expect(response.body.status).toBe('healthy');
    });
    
    it('GET /health/live should return 200', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.alive).toBe(true);
    });
  });
  
  describe('API Info', () => {
    it('GET /api should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI Messaging Platform API');
      expect(response.body.version).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
    });
  });
  
  describe('Protected Routes', () => {
    it('GET /api/auth/me should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
        
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
    
    it('GET /api/conversations should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .expect(401);
        
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    it('GET /non-existent should return 404', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);
        
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
    });
  });
}); 