/**
 * BeaPop Cart Page
 * Handles cart display and management using CartStore module
 */

import CartStore from '../src/cart/CartStore.js';

// Product data
const PRODUCT_PRICES = {
  'cosrx-snail':420000,'boj-sun':380000,'anua-toner':450000,'torriden-serum':400000,
  'skin1004':420000,'mediheal':300000,'roundlab':380000,'romand':250000,
  'txt-7th':500000,'babymonster':500000,'combo-skincare':1100000,'combo-mix':950000
};

const PRODUCT_NAMES = {
  'cosrx-snail':'COSRX Snail Mucin','boj-sun':'BOJ Relief Sun SPF50+',
  'anua-toner':'Anua Heartleaf Toner','torriden-serum':'Torriden HA Serum',
  'skin1004':'SKIN1004 Centella','mediheal':'Mediheal Blemish Pad',
  'roundlab':'Round Lab Dokdo Toner','romand':'Romand Juicy Tint',
  'txt-7th':'TXT — minisode 3','babymonster':'BABYMONSTER Album',
  'combo-skincare':'Combo Skincare','combo-mix':'Mix Box K-Pop+Beauty'
};

const PRODUCT_IMAGES = {
  'cosrx-snail':'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&q=80&fit=crop',
  'boj-sun':'https://images.unsplash.com/photo-1556228720-1987df4d3f31?w=300&h=300&q=80&fit=crop',
  'anua-toner':'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=300&h=300&q=80&fit=crop',
  'torriden-serum':'https://images.unsplash.com/photo-1571781565023-40f8d4752541?w=300&h=300&q=80&fit=crop',
  'skin1004':'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?w=300&h=300&q=80&fit=crop',
  'mediheal':'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=300&h=300&q=80&fit=crop',
  'roundlab':'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=300&h=300&q=80&fit=crop',
  'romand':'https://images.unsplash.com/photo-1631730494960-9a8b0815b76a?w=300&h=300&q=80&fit=crop',
  'txt-7th':'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&q=80&fit=crop',
  'babymonster':'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&h=300&q=80&fit=crop',
  'combo-skincare':'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=300&q=80&fit=crop',
  'combo-mix':'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=300&q=80&fit=crop'
};

/**
 * Format price in Vietnamese Dong
 */
function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

/**
 * Show sync toast notification
 */
function showSyncToast(msg, bg = '#1a1a1a') {
  const old = document.getElementById('_syncToast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = '_syncToast';
  t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:10px 20px;border-radius:10px;font-size:0.82rem;font-weight:600;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,0.25);max-width:88%;text-align:center;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 350); }, 3500);
}

/**
 * Update cart badge in navigation
 */
function updateCartBadge(items) {
  const count = Object.values(items).reduce((s, q) => s + q, 0);
  const badge = document.getElementById('navCartBadge');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
}

/**
 * Render cart content
 */
function renderCart(items) {
  const container = document.getElementById('cartContent');
  const entries = Object.entries(items).filter(([,v]) => v > 0);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div class="cart-empty-msg">Giỏ hàng trống</div>
        <div class="cart-empty-sub">Thêm sản phẩm để bắt đầu mua sắm</div>
        <a href="catalog.html" class="shop-btn">🛍️ Tiếp tục mua sắm</a>
      </div>`;
    return;
  }

  let subtotal = 0;
  const itemsHtml = entries.map(([id, qty]) => {
    const price = PRODUCT_PRICES[id] || 0;
    const itemTotal = price * qty;
    subtotal += itemTotal;
    return `
      <div class="cart-item" data-id="${id}">
        <img src="${PRODUCT_IMAGES[id] || 'https://images.unsplash.com/photo-1556228720-1987df4d3f31?w=300&h=300'}" alt="${PRODUCT_NAMES[id] || id}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-name">${PRODUCT_NAMES[id] || id}</div>
          <div class="cart-item-unit">Giá đơn vị</div>
          <div class="cart-item-price">${formatPrice(price)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <div class="qty-control">
            <button class="qty-btn" data-action="dec" data-id="${id}">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${id}">+</button>
          </div>
          <button class="delete-btn" data-action="del" data-id="${id}">🗑 Xoá</button>
          <div style="font-size:0.9rem;font-weight:800;color:#1a8a5e;">Thành tiền: ${formatPrice(itemTotal)}</div>
        </div>
      </div>`;
  }).join('');

  const itemCount = entries.reduce((s, [,q]) => s + q, 0);
  const isSyncing = CartStore.isSyncing();
  const syncIndicator = localStorage.getItem('customerToken')
    ? `<div style="font-size:0.7rem;color:${isSyncing ? '#f59e0b' : '#1a8a5e'};margin-top:6px;text-align:center;">${isSyncing ? '🔄 Đang đồng bộ...' : '☁️ Đã lưu'}</div>`
    : '';

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">${itemsHtml}</div>
      <div class="cart-summary">
        <div class="summary-title">📋 Tóm tắt đơn hàng</div>
        <div class="summary-row">
          <span class="summary-label">Số lượng sản phẩm</span>
          <span class="summary-value">${itemCount} sản phẩm</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Tạm tính</span>
          <span class="summary-value">${formatPrice(subtotal)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Phí vận chuyển</span>
          <span class="summary-value" style="color:#1a8a5e;">Miễn phí</span>
        </div>
        <div class="summary-total">
          <span class="total-label">Tổng cộng</span>
          <span class="total-value">${formatPrice(subtotal)}</span>
        </div>
        <a href="order-form.html" class="checkout-btn">Đặt Hàng Ngay →</a>
        <div style="text-align:center;margin-top:12px;font-size:0.75rem;color:var(--text-secondary);">
          🔒 Thanh toán an toàn • Xác nhận trong 30 phút
        </div>
        ${syncIndicator}
      </div>
    </div>`;

  // Attach click event handlers
  container.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'inc') CartStore.delta(id, 1);
    if (action === 'dec') CartStore.delta(id, -1);
    if (action === 'del') CartStore.remove(id);
  };
}

// Service worker offline order sync toasts
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'ORDER_QUEUED') showSyncToast('📦 ' + (e.data.message || 'Đơn hàng đã lưu offline.'));
  if (e.data?.type === 'ORDERS_SYNCED') showSyncToast('✅ ' + (e.data.message || `${e.data.synced} đơn hàng đã gửi!`), '#059669');
});

// Show offline indicator when network drops
window.addEventListener('offline', () => showSyncToast('📡 Mất kết nối — giỏ hàng vẫn được lưu offline', '#b45309'));
window.addEventListener('online',  () => showSyncToast('✅ Kết nối lại — đang đồng bộ giỏ hàng...', '#059669'));

// Bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  await CartStore.init();
  // Subscribe: re-render whenever cart changes
  CartStore.subscribe(items => {
    updateCartBadge(items);
    renderCart(items);
  });
});
