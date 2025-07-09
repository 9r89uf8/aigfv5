/**
 * Jest Configuration
 * Testing setup for the AI Messaging Platform
 */
export default {
  // Use ES modules
  testEnvironment: 'node',
  transform: {},
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/scripts/**',
    '!src/server.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  
  // Module paths
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  
  // Globals
  globals: {
    'NODE_ENV': 'test'
  },
  
  // Timeouts
  testTimeout: 10000,
  
  // Verbose output
  verbose: true
}; 