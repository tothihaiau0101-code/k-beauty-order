// Utils - Common utilities for admin panel

/**
 * API base URL - Cloudflare Worker URL
 */
export const API_BASE = 'https://beapop-api.beapop.workers.dev';

/**
 * Status mapping for order statuses
 */
export const STATUS_MAP = {
  pending:   { label: 'Chờ xác nhận', icon: '🟡', cls: 'status-pending' },
  confirmed: { label: 'Đã xác nhận',  icon: '🔵', cls: 'status-confirmed' },
  shipping:  { label: 'Đang giao',    icon: '🚚', cls: 'status-shipping' },
  completed: { label: 'Hoàn thành',   icon: '✅', cls: 'status-completed' },
  cancelled: { label: 'Đã hủy',       icon: '❌', cls: 'status-cancelled' }
};

/**
 * Format number as Vietnamese currency
 * @param {number} n - The number to format
 * @returns {string} Formatted currency string
 */
export function formatVND(n) {
  n = parseFloat(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'M';
  if (n > 0) return n.toLocaleString('vi') + '₫';
  return '0₫';
}

/**
 * Auth guard - check for admin token (stored in sessionStorage)
 * @returns {string|null} The auth token or null
 */
export function getAuthToken() {
  return sessionStorage.getItem('adminToken');
}

/**
 * Fetch wrapper with auth header
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function apiFetch(url, options = {}) {
  const token = getAuthToken();
  options.headers = Object.assign({}, options.headers || {}, {
    'Authorization': token ? 'Bearer ' + token : ''
  });
  const res = await fetch(url, options);
  if (res.status === 401) {
    sessionStorage.removeItem('adminToken');
    window.location.href = 'login.html';
  }
  return res;
}
