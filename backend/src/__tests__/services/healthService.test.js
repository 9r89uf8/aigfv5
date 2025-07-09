/**
 * Health Service Tests
 */
import { 
  basicHealthCheck, 
  livenessCheck, 
  HealthStatus 
} from '../../services/healthService.js';

describe('Health Service', () => {
  describe('basicHealthCheck', () => {
    it('should return healthy status with basic info', () => {
      const result = basicHealthCheck();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.environment).toBe('test');
      expect(result.version).toBeDefined();
    });
  });
  
  describe('livenessCheck', () => {
    it('should return alive status', () => {
      const result = livenessCheck();
      
      expect(result.alive).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.pid).toBe(process.pid);
    });
  });
  
  describe('HealthStatus constants', () => {
    it('should have correct status values', () => {
      expect(HealthStatus.HEALTHY).toBe('healthy');
      expect(HealthStatus.DEGRADED).toBe('degraded');
      expect(HealthStatus.UNHEALTHY).toBe('unhealthy');
    });
  });
}); 