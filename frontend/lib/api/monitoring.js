/**
 * Monitoring API Service
 * Provides functions to fetch Firebase optimization monitoring data
 */
import apiClient from './client';

/**
 * Get comprehensive optimization status
 * @returns {Promise<Object>} Optimization metrics and status
 */
export const getOptimizationStatus = async () => {
  try {
    const response = await apiClient.get('/monitoring/optimization');
    return response.data;
  } catch (error) {
    console.error('Error fetching optimization status:', error);
    throw error;
  }
};

/**
 * Get detailed buffer status
 * @returns {Promise<Object>} Buffer details and recommendations
 */
export const getBufferStatus = async () => {
  try {
    const response = await apiClient.get('/monitoring/buffers');
    return response.data;
  } catch (error) {
    console.error('Error fetching buffer status:', error);
    throw error;
  }
};

/**
 * Get optimization metrics
 * @returns {Promise<Object>} Raw optimization metrics
 */
export const getMetrics = async () => {
  try {
    const response = await apiClient.get('/monitoring/metrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
};

/**
 * Get detailed health status
 * @returns {Promise<Object>} System health with optimization details
 */
export const getHealthStatus = async () => {
  try {
    const response = await apiClient.get('/monitoring/health/detailed');
    return response.data;
  } catch (error) {
    console.error('Error fetching health status:', error);
    throw error;
  }
};

/**
 * Force flush all buffers (admin action)
 * @returns {Promise<Object>} Flush results
 */
export const forceFlushBuffers = async () => {
  try {
    const response = await apiClient.post('/monitoring/force-flush');
    return response.data;
  } catch (error) {
    console.error('Error forcing buffer flush:', error);
    throw error;
  }
};

/**
 * Reset optimization metrics (admin action)
 * @returns {Promise<Object>} Reset confirmation
 */
export const resetMetrics = async () => {
  try {
    const response = await apiClient.post('/monitoring/reset-metrics');
    return response.data;
  } catch (error) {
    console.error('Error resetting metrics:', error);
    throw error;
  }
};

/**
 * Toggle fallback mode (admin action)
 * @param {boolean} enable - Enable or disable fallback mode
 * @param {string} reason - Reason for toggling (optional)
 * @returns {Promise<Object>} Updated fallback status
 */
export const toggleFallbackMode = async (enable, reason = '') => {
  try {
    const response = await apiClient.post('/monitoring/fallback/toggle', {
      enable,
      reason
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling fallback mode:', error);
    throw error;
  }
};

/**
 * Fetch all monitoring data at once
 * @returns {Promise<Object>} Combined monitoring data
 */
export const getAllMonitoringData = async () => {
  try {
    const [optimization, buffers, metrics, health] = await Promise.all([
      getOptimizationStatus(),
      getBufferStatus(),
      getMetrics(),
      getHealthStatus()
    ]);

    return {
      optimization,
      buffers,
      metrics,
      health,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching all monitoring data:', error);
    throw error;
  }
};

// Helper function to format error messages
export const formatMonitoringError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper function to check if user has admin access
export const checkAdminAccess = (error) => {
  return error.response?.status === 403;
};

export default {
  getOptimizationStatus,
  getBufferStatus,
  getMetrics,
  getHealthStatus,
  forceFlushBuffers,
  resetMetrics,
  toggleFallbackMode,
  getAllMonitoringData,
  formatMonitoringError,
  checkAdminAccess
};