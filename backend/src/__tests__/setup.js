/**
 * Test Setup
 * Global setup for all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock logger to reduce noise in tests
jest.mock('../utils/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Set test environment variables
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
process.env.FIREBASE_DATABASE_URL = 'https://test.firebaseio.com';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Global test utilities
global.testUtils = {
  // Generate test user
  generateTestUser: (overrides = {}) => ({
    uid: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    isPremium: false,
    isAdmin: false,
    ...overrides
  }),
  
  // Generate test character
  generateTestCharacter: (overrides = {}) => ({
    id: 'test-char-id',
    name: 'Test Character',
    description: 'A test character',
    personality: {
      traits: ['friendly'],
      tone: 'casual'
    },
    ...overrides
  }),
  
  // Mock Express request
  mockRequest: (data = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...data
  }),
  
  // Mock Express response
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // Mock next function
  mockNext: jest.fn()
}; 