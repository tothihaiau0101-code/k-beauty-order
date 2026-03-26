/**
 * BeaPop K-Beauty Order Form
 * Handles product selection, cart management, and order submission
 */

// ---- PRODUCT DATA ----
const PRODUCTS = {
  beauty: [
    { id: 'cosrx-snail', img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&q=80&fit=crop', name: 'COSRX Snail Mucin', spec: '100ml', price: 420000, oldPrice: 550000, tag: 'hot', tagLabel: '#1 Bestseller' },
    { id: 'boj-sun', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&q=80&fit=crop', name: 'BoJ Relief Sun SPF50+', spec: '50ml', price: 380000, oldPrice: 500000, tag: 'hot', tagLabel: 'Bestseller' },
    { id: 'anua-toner', img: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=200&h=200&q=80&fit=crop', name: 'Anua Heartleaf Toner', spec: '250ml', price: 450000, oldPrice: 600000, tag: 'hot', tagLabel: 'Bestseller' },
    { id: 'torriden-serum', img: 'https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=200&h=200&q=80&fit=crop', name: 'Torriden Dive-In HA Serum', spec: '50ml', price: 400000, oldPrice: 520000, tag: 'new', tagLabel: 'New' },
    { id: 'skin1004', img: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200&h=200&q=80&fit=crop', name: 'SKIN1004 Centella Ampoule', spec: '100ml', price: 420000, oldPrice: 550000 },
    { id: 'mediheal', img: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=200&h=200&q=80&fit=crop', name: 'Mediheal Blemish Pad', spec: '100 miếng', price: 300000, oldPrice: 400000 },
    { id: 'roundlab', img: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=200&h=200&q=80&fit=crop', name: 'Round Lab 1025 Dokdo Toner', spec: '200ml', price: 380000, oldPrice: 480000 },
    { id: 'romand', img: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200&h=200&q=80&fit=crop', name: 'Romand Juicy Lasting Tint', spec: '5.5g', price: 250000, oldPrice: 350000, tag: 'new', tagLabel: 'Hot' },
  ],
  kpop: [
    { id: 'txt-7th', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&q=80&fit=crop', name: 'TXT — 7TH YEAR', spec: '8th Mini Album · 13/04', price: 500000, tag: 'new', tagLabel: 'Pre-order' },
    { id: 'bts-arirang', img: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&q=80&fit=crop', name: 'BTS — ARIRANG', spec: '5th Album · 2026', price: 600000, tag: 'new', tagLabel: 'Pre-order' },
    { id: 'babymonster', img: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&h=200&q=80&fit=crop', name: 'BABYMONSTER — CHOOM', spec: 'Mini Album · 05/2026', price: 500000, tag: 'new', tagLabel: 'New' },
    { id: 'kissoflife', img: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=200&h=200&q=80&fit=crop', name: 'KISS OF LIFE — Comeback', spec: '04/2026', price: 480000 },
    { id: 'nctwish', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&q=80&fit=crop', name: 'NCT WISH — Full Album', spec: '04/2026', price: 450000 },
  ],
  combo: [
    { id: 'combo-skincare', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&q=80&fit=crop', name: 'Skincare Starter', spec: '3 samples', price: 150000, tag: 'hot', tagLabel: 'Phổ biến' },
    { id: 'combo-sun', img: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200&h=200&q=80&fit=crop', name: 'Sun & Glow', spec: 'Mini sun + pads', price: 120000 },
    { id: 'combo-kpop', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&q=80&fit=crop', name: 'K-Pop Surprise', spec: 'Photocard + Sticker', price: 200000 },
    { id: 'combo-mix', img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&q=80&fit=crop', name: 'Mix Box', spec: '2 mỹ phẩm + 1 album', price: 300000, tag: 'new', tagLabel: 'Best value' },
  ]
};

// ---- STATE ----
let cart = JSON.parse(localStorage.getItem('kbeauty_cart')) || {};
let activeVoucher = null;

// API URL helper
function getApiUrl() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : (document.querySelector('meta[name="api-url"]')?.content || 'https://beapop-api.beapop.workers.dev');
}

// ---- FORMAT PRICE ----
function formatPrice(n) {
  return n.toLocaleString('vi-VN') + '₫';
}

// ---- UPDATE CART BADGE ----
function updateCartBadge() {
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const badge = document.getElementById('navCartBadge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ---- SAVE CART ----
function saveCart() {
  localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
}

// ---- RENDER PRODUCTS ----
function renderProducts(containerId, items) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = items.map(p => `
    <div class="pick-card" data-id="${p.id}" onclick="toggleProduct('${p.id}')">
      ${p.tag ? `<span class="pick-tag pick-tag-${p.tag}">${p.tagLabel}</span>` : ''}
      <div class="pick-check">✓</div>
      <img src="${p.img}" alt="${p.name}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;margin-bottom:6px;">
      <div class="pick-name">${p.name}</div>
      <div class="pick-brand">${p.spec}</div>
      <div>
        <span class="pick-price">${formatPrice(p.price)}</span>
        ${p.oldPrice ? `<span class="pick-price-old">${formatPrice(p.oldPrice)}</span>` : ''}
      </div>
      <div class="qty-control">
        <button type="button" class="qty-btn" onclick="event.stopPropagation(); changeQty('${p.id}', -1)">−</button>
        <span class="qty-num" id="qty-${p.id}">${cart[p.id] || 1}</span>
        <button type="button" class="qty-btn" onclick="event.stopPropagation(); changeQty('${p.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

// ---- FIND PRODUCT ----
function findProduct(id) {
  for (const group of Object.values(PRODUCTS)) {
    const p = group.find(x => x.id === id);
    if (p) return p;
  }
  return null;
}

// ---- TOGGLE PRODUCT ----
function toggleProduct(id) {
  if (cart[id]) {
    delete cart[id];
  } else {
    cart[id] = 1;
  }
  saveCart();
  updateUI();
}

// ---- CHANGE QUANTITY ----
function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id] = Math.max(1, (cart[id] || 1) + delta);
  document.getElementById('qty-' + id).textContent = cart[id];
  saveCart();
  updateCart();
}

// ---- UPDATE UI ----
function updateUI() {
  // Update card states
  document.querySelectorAll('.pick-card').forEach(card => {
    const id = card.dataset.id;
    card.classList.toggle('selected', !!cart[id]);
    const qtyEl = card.querySelector('.qty-num');
    if (qtyEl) qtyEl.textContent = cart[id] || 1;
  });
  updateCart();
}

// ---- UPDATE CART ----
function updateCart() {
  const ids = Object.keys(cart);
  let total = 0;
  let count = 0;
  const lines = [];

  ids.forEach(id => {
    const p = findProduct(id);
    if (!p) return;
    const qty = cart[id];
    count += qty;
    total += p.price * qty;
    lines.push(`${p.name} x${qty}`);
  });

  // Cart bar
  const bar = document.getElementById('cartBar');
  bar.classList.toggle('show', count > 0);
  document.getElementById('cartCount').textContent = count;

  // Apply voucher discount
  let discountAmt = 0;
  if (activeVoucher) {
    if (activeVoucher.type === 'percent') {
      discountAmt = Math.round(total * activeVoucher.value / 100);
      if (activeVoucher.max) discountAmt = Math.min(discountAmt, activeVoucher.max);
    } else {
      discountAmt = activeVoucher.value;
    }
  }
  const finalTotal = Math.max(0, total - discountAmt);
  document.getElementById('cartTotal').textContent = formatPrice(finalTotal);
  document.getElementById('cartPreview').textContent = lines.join(' · ');
  document.getElementById('submitBtn').disabled = count === 0;
}

// ---- VOUCHER SYSTEM ----
const VOUCHERS = {
  'WELCOME10': { label: 'Giảm 10%', type: 'percent', value: 10 },
  'FREESHIP': { label: 'Giảm 30,000₫ ship', type: 'fixed', value: 30000 },
  'KBEAUTY20': { label: 'Giảm 20% (max 100k)', type: 'percent', value: 20, max: 100000 }
};

function applyVoucher() {
  const code = document.getElementById('voucherCode').value.trim().toUpperCase();
  const el = document.getElementById('voucherResult');
  if (!code) {
    el.style.display = 'none';
    activeVoucher = null;
    updateUI();
    return;
  }

  // Check static vouchers first
  let v = VOUCHERS[code];
  if (!v && window.BeaPop && window.BeaPop.Auth.isLoggedIn()) {
    // Check user loyalty vouchers
    const lv = window.BeaPop.Auth.findVoucher(code);
    if (lv) v = { ...lv, _loyalty: true, _code: lv.code };
  }

  el.style.display = 'block';
  if (v) {
    activeVoucher = v;
    el.style.background = 'rgba(16,185,129,0.15)';
    el.style.color = '#10b981';
    el.textContent = '✅ ' + v.label + ' — Mã: ' + code;
    updateUI();
  } else {
    activeVoucher = null;
    el.style.background = 'rgba(239,68,68,0.15)';
    el.style.color = '#ef4444';
    el.textContent = '❌ Mã không hợp lệ';
    updateUI();
  }
}

// ---- PAYMENT SELECTION ----
function selectPayment(method) {
  document.querySelectorAll('.pay-method').forEach(el => el.classList.remove('active'));
  document.querySelector(`.pay-method[data-method="${method}"]`).classList.add('active');
  document.getElementById('paymentMethod').value = method;
}

// ---- VALIDATION ----
function validate() {
  let ok = true;
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();

  document.getElementById('fg-name').classList.toggle('has-error', !name);
  if (!name) ok = false;
  const phoneOk = /^0\d{9}$/.test(phone);
  document.getElementById('fg-phone').classList.toggle('has-error', !phoneOk);
  if (!phoneOk) ok = false;
  document.getElementById('fg-address').classList.toggle('has-error', !address);
  if (!address) ok = false;

  if (Object.keys(cart).length === 0) ok = false;
  return ok;
}

// ---- GENERATE ORDER ID ----
function generateOrderId() {
  return 'KB-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.random().toString(36).toUpperCase().slice(-2);
}

// ---- SHOW PAYMENT MODAL ----
function showPaymentModal(orderId, amount, itemSummary, payosCheckoutUrl) {
  const method = document.getElementById('paymentMethod').value;
  const transferNote = orderId;
  const displayNote = `${orderId} ${itemSummary}`.slice(0, 50);
  document.getElementById('modalOrderId').textContent = orderId;
  document.getElementById('modalTransferNote').textContent = displayNote;
  const infoEl = document.getElementById('paymentInfo');
  const amtStr = formatVND(amount);

  if (method === 'bank') {
    if (payosCheckoutUrl) {
      // PayOS checkout URL available → redirect immediately
      window.location.href = payosCheckoutUrl;
      return;
    } else {
      // PayOS failed: show error message instead of static VietQR
      infoEl.innerHTML = `
        <div style="background:rgba(220,38,38,0.08);border:1.5px solid rgba(220,38,38,0.3);border-radius:14px;padding:22px;margin:12px 0;text-align:center;">
          <div style="font-size:2.2rem;margin-bottom:12px;">⚠️</div>
          <p style="color:#dc2626;font-size:1rem;font-weight:700;">Không kết nối được PayOS</p>
          <p style="color:#6b6b7b;font-size:0.85rem;margin:10px 0;">Vui lòng thử lại hoặc liên hệ hỗ trợ</p>
          <button onclick="location.reload()" style="margin-top:12px;padding:10px 24px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer;">🔄 Thử lại</button>
        </div>`;
    }
  } else if (method === 'momo') {
    // MoMo deep link
    const momoLink = `https://nhantien.momo.vn/0901234567`;
    infoEl.innerHTML = `
      <div style="background:rgba(214,48,141,0.06);border:1.5px solid rgba(214,48,141,0.2);border-radius:14px;padding:20px;margin:12px 0;">
        <div style="font-size:2.2rem;margin-bottom:8px;">📱</div>
        <p style="color:#a01870;font-size:1rem;font-weight:700;">Chuyển qua MoMo</p>
        <p style="color:#1a1a1a;font-size:0.88rem;margin-top:10px;">Số tiền: <span style="color:#a01870;font-weight:800;font-size:1.1rem;">${amtStr}</span></p>
        <p style="color:#1a1a1a;font-size:0.83rem;margin-top:6px;">SĐT: 0901234567 <button onclick="copyText('0901234567',this)" style="margin-left:6px;padding:2px 8px;border:1px solid rgba(160,24,112,0.2);border-radius:6px;background:rgba(160,24,112,0.06);color:#a01870;font-size:0.7rem;cursor:pointer;">Copy</button></p>
        <p style="color:#1a1a1a;font-size:0.83rem;margin-top:4px;">Nội dung CK: <span style="color:#d4a017;font-weight:600;">${transferNote}</span></p>
        <a href="${momoLink}" target="_blank" style="display:inline-block;margin-top:14px;padding:12px 28px;background:#d6308d;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.88rem;">🚀 Mở MoMo chuyển ngay</a>
      </div>`;

  } else if (method === 'zalopay') {
    const zaloLink = `https://social.zalopay.vn/0901234567`;
    infoEl.innerHTML = `
      <div style="background:rgba(0,132,255,0.06);border:1.5px solid rgba(0,132,255,0.2);border-radius:14px;padding:20px;margin:12px 0;">
        <div style="font-size:2.2rem;margin-bottom:8px;">💙</div>
        <p style="color:#005ecb;font-size:1rem;font-weight:700;">Chuyển qua ZaloPay</p>
        <p style="color:#1a1a1a;font-size:0.88rem;margin-top:10px;">Số tiền: <span style="color:#005ecb;font-weight:800;font-size:1.1rem;">${amtStr}</span></p>
        <p style="color:#1a1a1a;font-size:0.83rem;margin-top:6px;">SĐT: 0901234567 <button onclick="copyText('0901234567',this)" style="margin-left:6px;padding:2px 8px;border:1px solid rgba(0,94,203,0.2);border-radius:6px;background:rgba(0,94,203,0.06);color:#005ecb;font-size:0.7rem;cursor:pointer;">Copy</button></p>
        <p style="color:#1a1a1a;font-size:0.83rem;margin-top:4px;">Nội dung CK: <span style="color:#d4a017;font-weight:600;">${transferNote}</span></p>
        <a href="${zaloLink}" target="_blank" style="display:inline-block;margin-top:14px;padding:12px 28px;background:#0084ff;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.88rem;">🚀 Mở ZaloPay chuyển ngay</a>
      </div>`;

  } else if (method === 'cod') {
    // COD — success is instant (no payment needed upfront)
    document.getElementById('modalTitle').textContent = '✅ Đặt hàng thành công!';
    infoEl.innerHTML = `
      <div style="background:rgba(26,138,94,0.06);border:1.5px solid rgba(26,138,94,0.2);border-radius:14px;padding:20px;margin:12px 0;">
        <div style="font-size:2.2rem;margin-bottom:8px;">🚚</div>
        <p style="color:#1a8a5e;font-size:1rem;font-weight:700;">Thanh toán khi nhận hàng</p>
        <div style="background:#f8f8f8;border-radius:10px;padding:12px;margin-top:12px;text-align:left;border:1px solid rgba(0,0,0,0.07);">
          <p style="color:#1a1a1a;font-size:0.85rem;margin:0;">Tiền hàng: <span style="color:#1a8a5e;font-weight:700;">${amtStr}</span></p>
          <p style="color:#1a1a1a;font-size:0.85rem;margin:4px 0;">Phí ship COD: <span style="color:#d4a017;">+25,000₫</span></p>
          <div style="height:1px;background:rgba(0,0,0,0.07);margin:8px 0;"></div>
          <p style="color:#1a1a1a;font-size:0.93rem;margin:0;font-weight:700;">Tổng thu: <span style="color:#1a8a5e;">${formatVND(amount + 25000)}</span></p>
        </div>
        <p style="color:#6b6b7b;font-size:0.78rem;margin-top:10px;">📦 Shipper thu tiền khi giao — Chuẩn bị sẵn số tiền nhé!</p>
      </div>`;
  }
  document.getElementById('paymentModal').style.display = 'flex';
}

// ---- FORMAT VND ----
function formatVND(n) {
  return n.toLocaleString('vi') + '₫';
}

// ---- COPY TEXT ----
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ Đã copy!';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}

// ---- SHOW SUCCESS BANNER ----
function showSuccessBanner(orderId) {
  // Remove existing banner if any
  const existing = document.querySelector('.success-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'success-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:2000;background:#1a8a5e;color:#fff;padding:16px;text-align:center;font-weight:700;font-size:1rem;animation:slideDown 0.4s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
  banner.innerHTML = `✅ Đặt hàng thành công! Mã đơn: <strong>${orderId}</strong> — Chúng tôi sẽ liên hệ sớm nhé!`;
  document.body.prepend(banner);
  // Remove param from URL
  window.history.replaceState({}, '', window.location.pathname);
  // Auto-hide after 8 seconds
  setTimeout(() => {
    banner.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    banner.style.transform = 'translateY(-100%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 400);
  }, 8000);
}

// ---- SHOW TOAST ----
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:10px;font-size:0.85rem;font-weight:600;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,0.3);max-width:90%;text-align:center;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// ---- INITIALIZATION ----
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  // Auto-fill customer info if logged in
  if (window.BeaPop && window.BeaPop.Auth.isLoggedIn()) {
    const user = window.BeaPop.Auth.getUser();
    if (user) {
      let filled = false;
      if (user.name) { document.getElementById('name').value = user.name; filled = true; }
      if (user.phone) { document.getElementById('phone').value = user.phone; filled = true; }
      if (user.address) { document.getElementById('address').value = user.address; filled = true; }
      if (filled) document.getElementById('autofillBadge').style.display = 'block';
    }
  }

  // Detect return from PayOS
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    const oid = params.get('orderId');
    if (oid) {
      fetch(`${getApiUrl()}/api/order-status/${oid}`)
        .then(r => r.json())
        .then(d => {
          if (d.status === 'confirmed') {
            showSuccessBanner(oid);
          } else {
            setTimeout(() => showSuccessBanner(oid), 3000);
          }
        })
        .catch(() => showSuccessBanner(oid));
    }
  } else if (params.get('payment') === 'cancel') {
    showToast('Bạn đã huỷ thanh toán. Đơn hàng vẫn được giữ lại.');
  }

  // Render products
  renderProducts('picker-beauty', PRODUCTS.beauty);
  renderProducts('picker-kpop', PRODUCTS.kpop);
  renderProducts('picker-combo', PRODUCTS.combo);

  // Auto-select from URL or cart
  const selectId = params.get('select');
  if (selectId) {
    cart[selectId] = (cart[selectId] || 0) + 1;
    saveCart();
  }

  // Visually select all items in cart and scroll to first
  let firstCard = null;
  Object.keys(cart).forEach(id => {
    const card = document.querySelector(`.pick-card[data-id="${id}"]`);
    if (card && !firstCard) firstCard = card;
  });

  updateUI();

  if (firstCard) {
    setTimeout(() => {
      firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstCard.style.transition = 'box-shadow 0.3s';
      firstCard.style.boxShadow = '0 0 24px rgba(236,72,153,0.6)';
      setTimeout(() => { firstCard.style.boxShadow = ''; }, 2500);
    }, 300);
  }

  // Real-time stock sync
  const STOCK_TO_PICKER = {
    'KB001': 'cosrx-snail', 'KB002': 'boj-sun', 'KB003': 'anua-toner',
    'KB004': 'torriden-serum', 'KB005': 'skin1004', 'KB006': 'mediheal',
    'KB007': 'roundlab', 'KB008': 'romand',
    'ALB001': 'txt-7th', 'ALB002': 'bts-arirang', 'ALB003': 'babymonster',
    'ALB004': 'kissoflife', 'ALB005': 'nctwish'
  };

  fetch(getApiUrl() + '/api/inventory')
    .then(r => r.json())
    .then(stock => {
      stock.forEach(item => {
        const pickerId = STOCK_TO_PICKER[item.id];
        if (!pickerId) return;
        const card = document.querySelector(`.pick-card[data-id="${pickerId}"]`);
        if (!card) return;
        if (item.stock === 0) {
          card.style.opacity = '0.35';
          card.style.pointerEvents = 'none';
          card.setAttribute('onclick', '');
          const nameEl = card.querySelector('.pick-name');
          if (nameEl) nameEl.innerHTML += '<div style="color:#ef4444;font-size:0.7rem;margin-top:4px;">Hết hàng — liên hệ pre-order</div>';
        } else if (item.stock <= 2) {
          const brand = card.querySelector('.pick-brand');
          if (brand) brand.innerHTML += ` <span style="color:#eab308;font-size:0.65rem;">• Còn ${item.stock}</span>`;
        }
      });
    })
    .catch(() => {});

  // Auth state check
  const navAuth = document.getElementById('navAuth');
  const navAccount = document.getElementById('navAccount');
  const token = localStorage.getItem('customerToken');
  const user = JSON.parse(localStorage.getItem('customerUser') || '{}');

  if (token && user.name) {
    if (navAuth) navAuth.style.display = 'none';
    if (navAccount) {
      navAccount.style.display = 'block';
      navAccount.textContent = '👤 ' + user.name.split(' ').pop();
    }
  } else {
    if (navAuth) navAuth.style.display = 'block';
    if (navAccount) navAccount.style.display = 'none';
  }
});

// ---- FORM SUBMISSION ----
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Đang xử lý...';

  const orderId = generateOrderId();
  const items = [];
  let total = 0;

  Object.entries(cart).forEach(([id, qty]) => {
    const p = findProduct(id);
    if (!p) return;
    items.push({ name: `${p.name} ${p.spec}`, price: p.price, qty });
    total += p.price * qty;
  });

  // Apply voucher discount
  let discountAmt = 0;
  if (activeVoucher) {
    if (activeVoucher.type === 'percent') {
      discountAmt = Math.round(total * activeVoucher.value / 100);
      if (activeVoucher.max) discountAmt = Math.min(discountAmt, activeVoucher.max);
    } else {
      discountAmt = activeVoucher.value;
    }
  }
  const finalTotal = Math.max(0, total - discountAmt);

  const paymentMethod = document.getElementById('paymentMethod').value;
  let payosCheckoutUrl = null;
  let payosOrderCode = null;

  // If bank (PayOS), create payment link first
  if (paymentMethod === 'bank') {
    try {
      const resp = await fetch(getApiUrl() + '/api/payos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount: Math.round(finalTotal), description: `BeaPop ${orderId}`.slice(0, 25) })
      });
      if (resp.ok) {
        const result = await resp.json();
        payosCheckoutUrl = result.checkoutUrl;
        payosOrderCode = result.orderCode;
      }
    } catch (err) {
      /* PayOS create payment failed, falling back to static QR */
    }
  }

  const data = {
    orderId,
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    items,
    products: items.map(i => `${i.name} x${i.qty}`).join(', '),
    total: finalTotal,
    paymentMethod,
    payosOrderCode,
    note: document.getElementById('note').value.trim(),
    timestamp: new Date().toISOString()
  };

  // Submit order to D1 via Worker API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(getApiUrl() + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        items: data.items,
        total: finalTotal,
        status: 'pending',
        note: data.note ? `[${paymentMethod.toUpperCase()}] ${data.note}` : `[${paymentMethod.toUpperCase()}]`
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      if (window.BeaUI) BeaUI.ErrorBoundary.show('Đơn hàng đã được ghi nhận!', 'success', 3000);
    } else {
      if (window.BeaUI) BeaUI.ErrorBoundary.show('Lưu đơn hàng thất bại — vui lòng liên hệ hỗ trợ', 'warning', 6000);
    }
  } catch (err) {
    if (window.BeaUI) BeaUI.ErrorBoundary.show('Không thể kết nối server — đơn hàng vẫn được xử lý qua hotline', 'warning', 6000);
  }

  // Show payment modal
  const itemSummary = items.map(i => `${i.name.split(' ')[0]} x${i.qty}`).join(' ');
  showPaymentModal(orderId, finalTotal, itemSummary, payosCheckoutUrl);

  // Hide form
  document.getElementById('orderForm').style.display = 'none';
  document.getElementById('cartBar').style.display = 'none';

  // Post-order: save address + earn loyalty points for logged-in user
  if (window.BeaPop && window.BeaPop.Auth.isLoggedIn()) {
    window.BeaPop.Auth.saveAddress(data.address);
    const newVouchers = window.BeaPop.Auth.earnPoints(finalTotal);
    // Mark loyalty voucher as used if applied
    if (activeVoucher && activeVoucher._loyalty) {
      window.BeaPop.Auth.useVoucher(activeVoucher._code);
    }
    if (newVouchers && newVouchers.length > 0) {
      setTimeout(() => {
        if (window.BeaPop) window.BeaPop.toast('🎁 Bạn nhận được voucher mới: ' + newVouchers.map(v => v.label).join(', '));
      }, 2000);
    }
  }

  // Clear Cart
  localStorage.removeItem('kbeauty_cart');

  btn.disabled = false;
  btn.textContent = '📩 Đặt Hàng Ngay';
});

// ---- SERVICE WORKER MESSAGE LISTENER ----
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'ORDER_QUEUED') {
    showToast('📦 ' + (e.data.message || 'Đơn hàng đã lưu offline. Sẽ gửi khi có mạng.'));
  }
  if (e.data?.type === 'ORDERS_SYNCED') {
    showToast('✅ ' + (e.data.message || `${e.data.synced} đơn hàng đã gửi!`), '#059669');
  }
});

// Make functions globally available
window.toggleProduct = toggleProduct;
window.changeQty = changeQty;
window.applyVoucher = applyVoucher;
window.selectPayment = selectPayment;
