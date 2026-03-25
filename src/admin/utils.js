// Utils - Common utilities for admin panel

/**
 * API base URL - read from meta tag (set in each HTML), fallback to Railway URL
 */
export const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : (document.querySelector('meta[name="api-url"]')?.content || 'https://beapop-api.kbeautyorder.workers.dev');

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
 * Auth guard - check for admin token
 * @returns {string|null} The auth token or null
 */
export function getAuthToken() {
  return sessionStorage.getItem('admin_token');
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
    'Authorization': 'Bearer ' + token
  });
  const res = await fetch(url, options);
  if (res.status === 401) {
    sessionStorage.removeItem('admin_token');
    window.location.href = 'login.html';
  }
  return res;
}
