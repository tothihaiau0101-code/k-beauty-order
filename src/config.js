/**
 * Application Configuration - Centralized API endpoints
 *
 * Usage:
 *   import { API_BASE } from './config.js';
 *
 * This ensures all API calls use the same endpoint configuration
 * that can be overridden via meta tags or environment variables.
 */

/**
 * Default API endpoints by environment
 * These are FALLBACK values - override in HTML via meta tag:
 *   <meta name="api-url" content="https://your-api.example.com">
 */
export const API_ENDPOINTS = {
  // Production
  production: 'https://beapop-api.beapop.workers.dev',

  // Development (local)
  development: 'http://localhost:5000',

  // Staging (optional - can be overridden)
  staging: 'https://staging-api.beapop.workers.dev',
};

/**
 * Get the current API base URL
 * Priority: meta tag > environment detection > fallback
 *
 * @returns {string} API base URL
 */
export function getApiBase() {
  // Check for meta tag override (set in HTML)
  const metaTag = document.querySelector('meta[name="api-url"]');
  if (metaTag && metaTag.content) {
    return metaTag.content.trim();
  }

  // Auto-detect environment
  const hostname = window.location.hostname;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return API_ENDPOINTS.development;
  }

  // Default to production
  return API_ENDPOINTS.production;
}

/**
 * Check if running in development mode
 * @returns {boolean}
 */
export function isDev() {
  return getApiBase() === API_ENDPOINTS.development;
}

/**
 * Check if running in production mode
 * @returns {boolean}
 */
export function isProd() {
  return getApiBase() === API_ENDPOINTS.production;
}

/**
 * Build full API URL for a given path
 * @param {string} path - API path (e.g., '/api/orders')
 * @returns {string} Full URL
 */
export function apiUrl(path) {
  const base = getApiBase();
  // Remove trailing slash from base, ensure path starts with /
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Build fetch options with auth token
 * @param {object} options - Base fetch options
 * @param {boolean} requireAuth - Whether to include auth token
 * @returns {object} Fetch options with headers
 */
export function buildFetchOptions(options = {}, requireAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if required and available
  if (requireAuth) {
    const token = localStorage.getItem('customerToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return {
    ...options,
    headers,
  };
}

/**
 * Safe fetch wrapper with automatic auth token handling
 * @param {string} path - API path
 * @param {object} options - Fetch options
 * @param {boolean} requireAuth - Whether to require authentication
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}, requireAuth = false) {
  const url = apiUrl(path);
  const fetchOptions = buildFetchOptions(options, requireAuth);

  try {
    const response = await fetch(url, fetchOptions);

    // Handle token expiration
    if (response.status === 401 && requireAuth) {
      // Clear expired token
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerUser');
      // Optionally redirect to login
      // window.location.href = '/login.html';
    }

    return response;
  } catch (error) {
    // Network error handling
    console.error(`API fetch error for ${path}:`, error);
    throw error;
  }
}

// Export for backward compatibility with existing code patterns
// Old code: const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '...'
// New code: import { API_BASE } from './config.js';
export const API_BASE = getApiBase();

// Default export for easy import
export default {
  API_ENDPOINTS,
  getApiBase,
  isDev,
  isProd,
  apiUrl,
  buildFetchOptions,
  apiFetch,
  API_BASE,
};
