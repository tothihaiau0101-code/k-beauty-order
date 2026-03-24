# CTO DISPATCH — Remaining Missions
# Project: /Users/apple/Documents/MEKONG CLI/apps/k-beauty-order
# Date: 2026-03-21

---

## ✅ ĐÃ HOÀN THÀNH
M41 Cart Dropdown · M42 Search · M43 Order Confirm · M26 Voucher · M44 Reviews+Ratings · M53 Popup Light Theme · M53b Purple→Black · M54 Payment Modal Light Theme · M59 PayOS Success Flow

---

## 🔴 SPRINT 4A — Còn thiếu (Worker làm ngay)

### MISSION 62: Sửa lỗi Service Worker Failed (PWA)
**File**: `index.html`, `sw.js`, `offline.html` [NEW] · **Effort**: 30m

**Vấn đề:** Giao diện báo lỗi "Service Worker Failed" do đường dẫn tĩnh tuyệt đối (`/sw.js`) không hoạt động đúng trên sub-folder hoặc Pages, đồng thời script thiếu file `offline.html`.

**Yêu cầu Worker sửa như sau:**

**Bước 1 — Sửa đường dẫn tuyệt đối trong `index.html`:**
Ở thẻ `<link rel="manifest">` và lệnh đăng ký `navigator.serviceWorker.register`, sửa `/` thành `./`:
```html
<link rel="manifest" href="./manifest.json">
<!-- ... -->
navigator.serviceWorker.register('./sw.js')
```

**Bước 2 — Sửa mảng `STATIC_ASSETS` trong `sw.js`:**
Cập nhật file cache đúng với thực tế thư mục `k-beauty-order`:
```javascript
const OFFLINE_PAGE = './offline.html';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',
  './styles.css',
  './auth.js',
  './chat-widget.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap'
];
```

**Bước 3 — Tạo file `offline.html` [NEW]:**
Tạo file HTML hiển thị lỗi mất kết nối mạng. Màu nền `#0f0f13`, chữ `You are offline` và chứa nút `Thử lại` để reload trang (`window.location.reload()`).

**Commit**: `fix(M62): service worker relative paths and offline page fallback`

---

### MISSION 63: Trang Đăng Ký Trải Nghiệm & Review (BeaPop Tester)
**File**: `tester.html` [NEW], `catalog.html` (và các file có navbar) · **Effort**: 2h

**Cơ chế:** Chương trình tặng sản phẩm miễn phí (hoặc minisize) để người dùng dùng thử và viết review thật trên website.

**Yêu cầu Worker thực hiện:**

**Bước 1 — Tạo giao diện `tester.html` [NEW]:**
- Kế thừa `<nav>`, CSS background và `<footer>` từ `catalog.html`.
- **Hero Banner**: "BeaPop Tester — Trở thành người dùng thử mỹ phẩm Hàn Quốc miễn phí và chia sẻ cảm nhận của bạn".
- **Danh sách Chiến dịch (Campaigns)**: Hiển thị 2-3 sản phẩm đang mở đăng ký test (Ví dụ: "Test Sữa Rửa Mặt RoundLab", "Kem Chống Nắng BoJ"). Mỗi thẻ có hiển thị số lượng slot (VD: "Còn 10/50 slot") và nút **"Đăng ký dùng thử"**.

**Bước 2 — Modal Giới Thiệu & Form Đăng ký:**
- Khi bấm "Đăng ký dùng thử", hiển thị modal form yêu cầu nhập:
  - Tên, SĐT, Địa chỉ nhận quà.
  - Tình trạng da (Select: Dầu / Khô / Hỗn hợp / Nhạy cảm).
  - Link MXH (Facebook/TikTok/IG) — Tuỳ chọn, nhưng ghi chú "Ưu tiên duyệt nếu có link MXH".
- Khi user submit: 
  - Validate dữ liệu, lưu LocalStorage (vd: `kbeauty_tester`).
  - Đóng form, hiện CSS Toast xanh lá: "✅ Đăng ký thành công! BeaPop sẽ liên hệ qua Zalo/SĐT nếu bạn được chọn."

**Bước 3 — Nút Báo cáo Review dành cho Tester:**
- Ở dưới cùng trang (hoặc góc trên), có nút/banner: **"Bạn đã nhận được sản phẩm test? Viết review ngay"**.
- Nút này sẽ link sang trang `reviews.html` với query param đặc biệt, hoặc mở một popup riêng trên trang báo cáo để Tester gắn link bài post của họ & review sao.

**Bước 4 — Thêm link vào Navbar toàn trang:**
- Mở `catalog.html`, `order-form.html`, `reviews.html`, `admin.html`, `account.html`, thêm link vào phần `<div class="nav-links">`:
  ```html
  <a href="tester.html">🎁 Tester</a>
  ```

**Commit**: `feat(M63): new product tester and review application page`

---

### MISSION 61: Trang Giỏ Hàng riêng (cart.html)
**File**: `cart.html` [NEW], `catalog.html`, `order-form.html` · **Effort**: 2h

**Yêu cầu:** Tạo trang `cart.html` — khách bấm icon 🛒 chuyển thẳng đến trang giỏ hàng, xem danh sách sản phẩm, điều chỉnh số lượng, xoá, rồi bấm "Đặt Hàng" chuyển sang `order-form.html`.

#### Bước 1 — Tạo `cart.html` [NEW]
- Copy `<head>`, nav, footer từ `catalog.html`
- Layout 2 cột (desktop): danh sách sản phẩm (trái) + tóm tắt đơn (phải)
- Mỗi sản phẩm trong cart hiển thị:
  - Tên sản phẩm
  - Giá đơn vị
  - Nút **−** | số lượng | **+**
  - Nút **🗑 Xoá**
  - Thành tiền (giá × số lượng)
- Footer phải: Tổng cộng + nút **"Đặt Hàng Ngay →"** → link `order-form.html`
- Nếu giỏ trống: hiện thông báo "Giỏ hàng trống" + nút **"Tiếp tục mua"** → `catalog.html`
- Đọc/ghi cart từ `localStorage('kbeauty_cart')`
- Dùng `PRODUCT_PRICES` map (copy từ catalog.html):
  ```javascript
  const PRODUCT_PRICES = {
    'cosrx-snail':420000,'boj-sun':380000,'anua-toner':450000,'torriden-serum':400000,
    'skin1004':420000,'mediheal':300000,'roundlab':380000,'romand':250000
  };
  const PRODUCT_NAMES = {
    'cosrx-snail':'COSRX Snail Mucin','boj-sun':'BOJ Relief Sun SPF50+',
    'anua-toner':'Anua Heartleaf Toner','torriden-serum':'Torriden HA Serum',
    'skin1004':'SKIN1004 Centella','mediheal':'Mediheal Blemish Pad',
    'roundlab':'Round Lab Dokdo Toner','romand':'Romand Juicy Tint'
  };
  ```

#### Bước 2 — Cập nhật `catalog.html`
Đổi nav cart link thành link đến `cart.html` (thay vì `order-form.html`):
```html
<a href="cart.html" class="nav-cart" id="navCart">
  🛒<span class="nav-cart-badge" id="navCartBadge" style="display:none;">0</span>
</a>
```

#### Bước 3 — Cập nhật `order-form.html`
Đổi link 🛒 trên navbar sang `cart.html`.

**Style**: Dùng theme sáng giống toàn trang (`#f8f8f8`, `#1a1a1a`, accent `#1a8a5e` và `#7c3aed`).

**Commit**: `feat(M61): standalone cart page with qty controls`

---

### MISSION 60: Cart Dropdown có nút cộng/bớt sản phẩm
**File**: `catalog.html` · **Effort**: 1h

**Yêu cầu:** Khi khách bấm icon 🛒 trên navbar → mở dropdown giỏ hàng ngay tại chỗ, có thể điều chỉnh số lượng hoặc xoá sản phẩm mà không cần vào order-form.

**Bước 1 — Đổi nav cart từ `<a>` thành `<button>`** (dòng 28):
```html
<!-- TỪ: -->
<a href="order-form.html" class="nav-cart" id="navCart" style="display:flex;">
<!-- THÀNH: -->
<button onclick="toggleCartDropdown(event)" class="nav-cart" id="navCart"
  style="display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:8px;">
```

**Bước 2 — Ẩn dropdown mặc định + thêm tổng tiền** (dòng 31-39):
```html
<div class="cart-dropdown" id="cartDropdown" style="display:none;">
  <div class="cart-dropdown-title">🛒 Giỏ hàng</div>
  <div class="cart-dropdown-items" id="cartDropdownItems">
    <div class="cart-dropdown-empty">Giỏ hàng trống</div>
  </div>
  <div class="cart-dropdown-footer" id="cartDropdownFooter">
    <div id="cartDropdownTotal" style="font-size:0.82rem;font-weight:700;color:#1a1a1a;margin-bottom:8px;display:none;"></div>
    <a href="order-form.html" class="cart-dropdown-checkout">Thanh toán →</a>
  </div>
</div>
```

**Bước 3 — JS: Thêm PRODUCT_PRICES map** (trước `updateCartUI`):
```javascript
const PRODUCT_PRICES = {
  'cosrx-snail':420000,'boj-sun':380000,'anua-toner':450000,'torriden-serum':400000,
  'skin1004':420000,'mediheal':300000,'roundlab':380000,'romand':250000,
  'txt-7th':500000,'babymonster':500000,'combo-skincare':1100000,'combo-mix':950000
};
```

**Bước 4 — JS: Cập nhật `updateCartUI()`** — thay phần render `dd.innerHTML` thành:
```javascript
const items = Object.entries(cart).filter(([,v]) => v > 0);
let total = 0;
dd.innerHTML = items.length === 0
  ? '<div class="cart-dropdown-empty">Giỏ hàng trống</div>'
  : items.map(([id, qty]) => {
      total += (PRODUCT_PRICES[id] || 0) * qty;
      return `<div class="cart-dropdown-item" style="align-items:center;gap:8px;padding:9px 12px;">
        <span class="cart-dropdown-item-name" style="flex:1;font-size:0.8rem;">${PRODUCT_NAMES[id]||id}</span>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          <button onclick="cartQty('${id}',-1)" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#f5f5f5;cursor:pointer;font-weight:700;">−</button>
          <span style="min-width:20px;text-align:center;font-weight:700;">${qty}</span>
          <button onclick="cartQty('${id}',1)"  style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#f5f5f5;cursor:pointer;font-weight:700;">+</button>
          <button onclick="cartRemove('${id}')" style="width:24px;height:24px;border-radius:6px;border:none;background:rgba(220,38,38,0.08);cursor:pointer;font-size:0.75rem;color:#dc2626;">✕</button>
        </div>
      </div>`;
    }).join('');
const totalEl = document.getElementById('cartDropdownTotal');
if (totalEl) { totalEl.textContent = 'Tổng: ' + total.toLocaleString('vi') + '₫'; totalEl.style.display = items.length ? 'block' : 'none'; }
```

**Bước 5 — JS: Thêm 3 hàm mới** (ngay sau `updateCartUI`):
```javascript
function cartQty(id, delta) {
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  if (cart[id] === 0) delete cart[id];
  localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
  updateCartUI();
}
function cartRemove(id) {
  delete cart[id];
  localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
  updateCartUI();
}
function toggleCartDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('cartDropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', () => {
  const dd = document.getElementById('cartDropdown');
  if (dd) dd.style.display = 'none';
});
document.getElementById('cartDropdown')?.addEventListener('click', e => e.stopPropagation());
```

**Commit**: `feat(M60): cart dropdown with qty controls (+/-/remove) and total price`

---

### MISSION 45: Lọc & Sort sản phẩm
**File**: `catalog.html`, `styles.css` · **Effort**: 1.5h

**Bước 1 — HTML**: Thêm filter bar sau search bar (dòng ~86):
```html
<div style="max-width:900px;margin:0 auto 16px;padding:0 16px;display:flex;gap:8px;flex-wrap:wrap;">
  <button onclick="filterCategory('all')" class="filter-btn active" data-cat="all">🌐 Tất cả</button>
  <button onclick="filterCategory('skincare')" class="filter-btn" data-cat="skincare">🧴 Skincare</button>
  <button onclick="filterCategory('makeup')" class="filter-btn" data-cat="makeup">💄 Makeup</button>
  <button onclick="filterCategory('album')" class="filter-btn" data-cat="album">🎵 Album</button>
  <button onclick="filterCategory('combo')" class="filter-btn" data-cat="combo">🎁 Combo</button>
</div>
```

**Bước 2 — CSS** (`styles.css`): Thêm sau `.btn-add-cart:hover`:
```css
.filter-btn {
  padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border);
  background: var(--bg-card); color: var(--text-secondary);
  font-family: inherit; font-size: 0.78rem; cursor: pointer; transition: all 0.2s;
}
.filter-btn:hover { border-color: var(--accent-purple); color: var(--text-primary); }
.filter-btn.active {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #fff; border-color: transparent;
}
```

**Bước 3 — JS**: Thêm sau `filterProducts()`:
```javascript
function filterCategory(cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.filter-btn[data-cat="${cat}"]`).classList.add('active');
  const sectionMap = { skincare:'k-beauty', makeup:'k-beauty', album:'k-pop', combo:'combos' };
  if (cat === 'all') {
    document.querySelectorAll('.section').forEach(s => s.style.display = '');
    document.querySelectorAll('.product-card').forEach(c => c.style.display = '');
  } else {
    document.querySelectorAll('.section').forEach(s => {
      s.style.display = s.id === sectionMap[cat] ? '' : 'none';
    });
    if (cat === 'skincare') {
      document.querySelectorAll('#k-beauty .product-card').forEach(c => {
        c.style.display = c.querySelector('h3')?.textContent.includes('Tint') ? 'none' : '';
      });
    } else if (cat === 'makeup') {
      document.querySelectorAll('#k-beauty .product-card').forEach(c => {
        c.style.display = c.querySelector('h3')?.textContent.includes('Tint') ? '' : 'none';
      });
    }
  }
}
```

**Commit**: `feat(M45): category filter bar (skincare/makeup/album/combo)`

---

### MISSION 4: Social Channels Floating Bar
**File**: `catalog.html` · **Effort**: 30 phút

Thêm trước `<!-- K-BEAUTY SECTION -->`:
```html
<div style="position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:100;display:flex;flex-direction:column;gap:10px;">
  <a href="https://zalo.me/" target="_blank" title="Zalo" style="width:40px;height:40px;border-radius:12px;background:rgba(0,132,255,0.15);display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1.1rem;border:1px solid rgba(0,132,255,0.2);">💬</a>
  <a href="https://facebook.com/" target="_blank" title="Facebook" style="width:40px;height:40px;border-radius:12px;background:rgba(66,103,178,0.15);display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1.1rem;border:1px solid rgba(66,103,178,0.2);">📘</a>
  <a href="https://instagram.com/" target="_blank" title="Instagram" style="width:40px;height:40px;border-radius:12px;background:rgba(225,48,108,0.15);display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1.1rem;border:1px solid rgba(225,48,108,0.2);">📸</a>
  <a href="https://tiktok.com/" target="_blank" title="TikTok" style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1.1rem;border:1px solid rgba(255,255,255,0.1);">🎵</a>
</div>
```

**Commit**: `feat(M4): social channels floating sidebar`

---

### MISSION 46: Trang tra cứu đơn hàng
**File**: `tracking.html` [NEW] · **Effort**: 2h

Tạo file `tracking.html` mới:
- Copy head/nav/footer từ `catalog.html`
- Form: input SĐT hoặc mã đơn + nút "Tra cứu"
- Hiển thị: timeline visual 4 bước (Chờ → Xác nhận → Đang giao → Hoàn thành)
- Data demo hardcode 2-3 đơn hàng mẫu
- Thêm link vào navbar tất cả các trang: `<a href="tracking.html">📦 Tra Cứu</a>`

**Commit**: `feat(M46): order tracking page with timeline`

---

## 🟢 SPRINT 5 — Scale

### MISSION 47: Blog / Hướng dẫn Skincare
**File**: `blog.html` [NEW] · **Effort**: 3h

- Trang blog mới, layout card grid giống catalog
- 5 bài viết hardcode: "Quy trình skincare 5 bước", "Top 5 kem chống nắng", "Cách chọn toner", "Review COSRX Snail", "K-Pop album nên mua 2025"
- Mỗi bài có ảnh, tiêu đề, excerpt, nút "Đọc thêm" toggle nội dung
- SEO: meta tags, heading hierarchy
- Thêm vào navbar: `<a href="blog.html">📝 Blog</a>`

**Commit**: `feat(M47): skincare blog page with 5 articles`

### MISSION 48: PWA / Installable
**File**: `manifest.json` [NEW], `sw.js` [NEW], `catalog.html` · **Effort**: 1.5h

- `manifest.json`: name, icons (emoji fallback), theme_color `#0a0a1a`, display standalone
- `sw.js`: cache static assets (HTML, CSS, images) offline-first
- Link manifest trong `<head>` tất cả các trang
- Register SW trong script tag

**Commit**: `feat(M48): PWA manifest and service worker`

---

## 🔵 SPRINT 6 — Enterprise

### MISSION 49: Multi-language EN/VI
**File**: tất cả HTML · **Effort**: 4h

- Toggle button EN/VI trên navbar
- JS i18n object `{ vi: {...}, en: {...} }`
- Swap `.textContent` theo ngôn ngữ, lưu `localStorage('lang')`

**Commit**: `feat(M49): multi-language EN/VI toggle`

### MISSION 50: Analytics Dashboard
**File**: `admin.html` · **Effort**: 3h

- Tab mới "📊 Analytics" trong admin
- Chart: conversion rate, top sản phẩm, traffic/ngày
- Tính từ orders data

**Commit**: `feat(M50): analytics dashboard tab`

### MISSION 51: Loyalty / Tích điểm
**File**: `order-form.html`, `admin.html` · **Effort**: 3h

- Mỗi đơn = tích điểm (10,000₫ = 1 điểm)
- Hiển thị điểm trên trang đặt hàng
- Admin xem bảng điểm khách

**Commit**: `feat(M51): loyalty points system`

---

## 🟠 SPRINT 7 — Automation & Funnels

### MISSION 52: Telegram Drip Campaign
**File**: `tools/telegram_bot.py` · **Effort**: 2h

- Thêm hàm `_run_drip_campaign(self)` chạy ngầm (thread) trong `KBeautyBot`.
- Logic: Quét `customers.json` mỗi giờ.
  - Nếu khách tham gia > 24h và chưa có đơn: Gửi tin nhắn Day 1 (Push Best Seller + Nhắc Voucher `WELCOME10`).
  - Lệnh test cho Admin: `/test_drip` để ép chạy ngay chiến dịch.
- Chèn thread khởi động vào hàm main hoặc cùng với lúc gọi webhook server.

**Commit**: `feat(M52): telegram auto drip campaign`

---

## 🟡 SPRINT 8 — UI Polish

### MISSION 53: Làm sáng Popup Chi Tiết Sản Phẩm
**File**: `catalog.html` (dòng 904–946) · **Effort**: 1h

**Vấn đề:** Popup sản phẩm hiện đang sử dụng dark theme (`background: linear-gradient(135deg,#12121e,#1a1a2e)`, màu chữ `rgba(255,255,255,0.4-0.65)`) trong khi toàn bộ website dùng Light Theme sáng (`#f8f8f8` / `#1a1a1a`).

**Yêu cầu Worker sửa như sau (catalog.html):**

1. **Overlay background** (`id="productModal"`): Giữ nguyên `rgba(0,0,0,0.5)` + `backdrop-filter:blur(10px)`.
2. **Modal container** (thẻ `div` con đầu tiên bên trong modal):
   - Đổi từ: `background:linear-gradient(135deg,#12121e 0%,#1a1a2e 100%);border:1px solid rgba(255,255,255,0.08);`
   - Thành: `background:#ffffff;border:1px solid rgba(0,0,0,0.08);box-shadow:0 20px 60px rgba(0,0,0,0.12);`
3. **Nút đóng ×** (`closeProductModal`):
   - Đổi từ: `color:rgba(255,255,255,0.5)` → `color:rgba(0,0,0,0.35)`
   - Hover từ: `#fff` → `#1a1a1a`
4. **Vùng ảnh trái** (`div` style chứa `modalImg`):
   - Đổi từ `background:rgba(255,255,255,0.02)` → `background:var(--bg-primary)` (= `#f8f8f8`)
5. **Brand label** (`id="modalBrand"`): Giữ tím `#a855f7` → Đổi thành `#7c3aed` (vẫn tím nhưng sáng hơn trên nền trắng).
6. **Tên sản phẩm** (`id="modalName"`): Đổi `color:#f0f0f5` → `color:#1a1a1a`.
7. **Spec** (`id="modalSpec"`): Đổi `color:rgba(255,255,255,0.4)` → `color:var(--text-secondary)`.
8. **Giá cũ** (`id="modalOldPrice"`): Đổi `color:rgba(255,255,255,0.3)` → `color:var(--text-muted)`.
9. **Các đường kẻ `border-top`**: Đổi từ `rgba(255,255,255,0.06)` → `rgba(0,0,0,0.07)`.
10. **Label section** (Mô tả, Hướng dẫn, Đánh giá): Giữ nguyên màu accent (xanh lá, vàng, xanh lam) nhưng kiểm tra contrast trên nền trắng vẫn đủ sáng.
11. **Chữ mô tả & hướng dẫn**: Đổi từ `color:rgba(255,255,255,0.65)` → `color:var(--text-secondary)`.
12. **Nút "Thêm Giỏ"**: Đổi `color:#c084fc` → `color:#7c3aed`; `border:rgba(168,85,247,0.3)` → `border:rgba(124,58,237,0.2)`.
13. **Review đánh giá**:
    - Tên reviewer: Đổi `color:#c084fc` → `color:#7c3aed`.
    - Chữ review: Đổi `color:rgba(255,255,255,0.6)` → `color:var(--text-secondary)`.
    - Border giữa các review: `rgba(255,255,255,0.04)` → `rgba(0,0,0,0.06)`.
14. **Nút "Xem thêm đánh giá"**: Giữ nguyên nhưng điều chỉnh background hover sáng hơn.

**Commit**: `feat(M53): light-theme product popup matching site palette`

### MISSION 53b: Đổi chữ tím → đen trong Popup
**File**: `catalog.html` · **Effort**: 10 phút

Trong modal `id="productModal"`, đổi **tất cả** chỗ có màu tím `#7c3aed` thành `#1a1a1a` (đen):
- `id="modalBrand"`: `color:#7c3aed` → `color:#1a1a1a`
- Nút "Thêm Giỏ": `color:#7c3aed` → `color:#1a1a1a`; `border: rgba(124,58,237,...)` → `border: rgba(0,0,0,0.12)`; hover background → `rgba(0,0,0,0.05)`
- JS reviews (dòng ~746): các chỗ render `color:#7c3aed` (tên reviewer) → `color:#1a1a1a`

**Commit**: `fix(M53b): popup brand & reviewer text black`

### MISSION 54: Light Theme cho Cart Bar & Payment Modal (Order Form)
**File**: `order-form.html` · **Effort**: 1h

**Vấn đề:** Trang `order-form.html` có 2 phần vẫn dùng dark theme trong khi website đã chuyển sang Light Theme:
1. **Cart Bar** (sticky bottom bar hiện khi chọn sản phẩm) — nền `rgba(6,6,14,0.95)` (đen)
2. **Payment Modal** (popup sau khi đặt hàng thành công) — nền `linear-gradient(135deg,#1a1a2e,#16213e)`, chữ `color:#fff`

**Yêu cầu Worker sửa:**

#### 1. Cart Bar CSS (dòng ~127):
- `background: rgba(6,6,14,0.95)` → `background: rgba(255,255,255,0.97)`
- `border-top` giữ nguyên

#### 2. Qty Buttons CSS (dòng ~113):
- `background: rgba(255,255,255,0.08)` → `background: rgba(0,0,0,0.06)`
- `:hover` `rgba(255,255,255,0.15)` → `rgba(0,0,0,0.12)`

#### 3. Payment Modal HTML (dòng ~702-711):
- Overlay: `rgba(0,0,0,0.7)` → `rgba(0,0,0,0.5)`
- Container: `background:linear-gradient(135deg,#1a1a2e,#16213e)` → `background:#ffffff`
- Border: `rgba(255,255,255,0.1)` → `rgba(0,0,0,0.08)`
- Box-shadow: `rgba(255,90,146,0.2)` → `rgba(0,0,0,0.15)`
- Heading: `color:#fff` → `color:#1a1a1a`
- Subtext: `rgba(255,255,255,0.6)` → `#6b6b7b`
- Mã đơn: `color:#a855f7` → `color:#059669`
- Links/muted text: `rgba(255,255,255,0.4-0.5)` → `#9a9aaa`

#### 4. JS Payment Info — Bank (dòng ~743-752):
- Info box: `background:rgba(255,255,255,0.05)` → `background:rgba(0,0,0,0.03)`
- Text: `color:#fff` → `color:#1a1a1a`
- Labels: `color:#a855f7` → `color:#059669`
- Giá: `color:#ff5a92` → `color:#e11d48`
- Copy buttons: purple accent → green accent `#059669`

#### 5. JS Payment Info — MoMo (dòng ~757-765):
- Background opacity: `0.1/0.3` → `0.06/0.15`
- Text: `color:#fff` → `color:#1a1a1a`

#### 6. JS Payment Info — ZaloPay (dòng ~769-777):
- Tương tự MoMo: `color:#fff` → `color:#1a1a1a`, opacity nhẹ hơn

#### 7. JS Payment Info — COD (dòng ~780-791):
- Info box: `rgba(255,255,255,0.05)` → `rgba(0,0,0,0.03)`
- Text: `color:#fff` → `color:#1a1a1a`
- Giá: `#ff5a92` → `#e11d48`
- Ship cost: `#fbbf24` → `#d97706`
- Divider: `rgba(255,255,255,0.1)` → `rgba(0,0,0,0.08)`
- Muted text: `rgba(255,255,255,0.5)` → `#9a9aaa`

**Commit**: `feat(M54): order-form cart bar & payment modal light theme` ✅ **ĐÃ HOÀN THÀNH**

---

### MISSION 59: Xác nhận "Đặt hàng thành công" chỉ sau khi nhận tiền
**File**: `order-form.html`, `tools/telegram_bot.py` · **Effort**: 2h

**Vấn đề:** Hiện tại modal hiện "⏳ Đang chờ thanh toán" ngay khi bấm đặt hàng — tốt hơn cũ nhưng chưa có flow phản hồi xác nhận khi khách THỰC SỰ thanh toán xong qua PayOS.

**Yêu cầu:**

#### Bước 1 — telegram_bot.py: Cấu hình returnUrl PayOS
Trong `/api/payos/create` (dòng ~575), khi tạo `CreatePaymentLinkRequest`, thêm:
```python
return_url=f"https://k-beauty-order.pages.dev/order-form?payment=success&orderId={order_id}",
cancel_url=f"https://k-beauty-order.pages.dev/order-form?payment=cancel&orderId={order_id}",
```

#### Bước 2 — order-form.html: Detect returnUrl param
Đầu script (sau `DOMContentLoaded`), thêm:
```javascript
// Detect return from PayOS
const _params = new URLSearchParams(window.location.search);
if (_params.get('payment') === 'success') {
  // Poll backend để confirm đơn
  const _oid = _params.get('orderId');
  if (_oid) {
    fetch(`${_API}/api/order-status/${_oid}`).then(r => r.json()).then(d => {
      if (d.status === 'confirmed') {
        showSuccessBanner(_oid);
      } else {
        // Chờ webhook (PayOS có thể chậm vài giây)
        setTimeout(() => showSuccessBanner(_oid), 3000);
      }
    }).catch(() => showSuccessBanner(_oid));
  }
} else if (_params.get('payment') === 'cancel') {
  showToast('Bạn đã huỷ thanh toán. Đơn hàng vẫn được giữ lại.');
}
```

#### Bước 3 — order-form.html: Hàm showSuccessBanner()
```javascript
function showSuccessBanner(orderId) {
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:2000;background:#1a8a5e;color:#fff;padding:16px;text-align:center;font-weight:700;font-size:1rem;animation:slideDown 0.4s ease;';
  banner.innerHTML = `✅ Đặt hàng thành công! Mã đơn: <strong>${orderId}</strong> — Chúng tôi sẽ liên hệ sớm nhé!`;
  document.body.prepend(banner);
  // Xoá param khỏi URL
  window.history.replaceState({}, '', window.location.pathname);
}
```

#### Bước 4 — telegram_bot.py: Thêm endpoint GET /api/order-status/:id
```python
elif path.startswith('/api/order-status/'):
    order_id = path.split('/')[-1]
    orders = self.bot._read_json(self.bot.orders_file)
    order = next((o for o in orders if o.get('id') == order_id), None)
    if order:
        self._json({'status': order.get('status', 'pending')})
    else:
        self._json({'status': 'not_found'}, 404)
```

**Commit**: `feat(M59): payos return-url success banner after payment confirmed`

---

## 🟣 SPRINT 9 — Loyalty Voucher Program



### MISSION 55: Chương trình Voucher Thưởng theo Mốc Chi Tiêu
**File**: `auth.js`, `account.html`, `order-form.html` · **Effort**: 3h

Khách hàng mua đủ target (mốc chi tiêu) sẽ tự động nhận voucher giảm giá.

#### Bước 1 — auth.js: Thêm constants & voucher engine

**1a.** Thêm sau dòng `const RATE_LIMIT_KEY = 'beapop_rate_limit';`:
```javascript
const VOUCHER_KEY = 'beapop_vouchers';

/* ---- LOYALTY REWARD MILESTONES ---- */
const REWARD_MILESTONES = [
  { target: 500000,   voucher: { code: 'LOYAL500K',  label: 'Giảm 5%',  type: 'percent', value: 5 } },
  { target: 1000000,  voucher: { code: 'LOYAL1M',    label: 'Giảm 10%', type: 'percent', value: 10, max: 100000 } },
  { target: 2000000,  voucher: { code: 'LOYAL2M',    label: 'Giảm 50k', type: 'fixed',   value: 50000 } },
  { target: 5000000,  voucher: { code: 'LOYAL5M',    label: 'Giảm 15%', type: 'percent', value: 15, max: 200000 } },
  { target: 10000000, voucher: { code: 'LOYAL10M',   label: 'Giảm 20%', type: 'percent', value: 20, max: 300000 } },
];
```

**1b.** Trong hàm `earnPoints()`, thêm ngay sau `this.logPoints(...)`:
```javascript
// Check loyalty milestones for voucher rewards
this.checkMilestones(user.totalSpent);
```

**1c.** Thêm các methods vào object `Auth`, sau `getPointsLog()` (đổi `}` cuối thành `},`):
```javascript
/* ---- LOYALTY VOUCHERS ---- */
getVouchers() {
  try { return JSON.parse(localStorage.getItem(VOUCHER_KEY)) || []; }
  catch(e) { return []; }
},

saveVouchers(vouchers) {
  localStorage.setItem(VOUCHER_KEY, JSON.stringify(vouchers));
},

getAvailableVouchers() {
  return this.getVouchers().filter(v => !v.used);
},

findVoucher(code) {
  return this.getVouchers().find(v => v.code === code.toUpperCase() && !v.used);
},

useVoucher(code) {
  const vouchers = this.getVouchers();
  const v = vouchers.find(v => v.code === code.toUpperCase() && !v.used);
  if (!v) return false;
  v.used = true;
  v.usedAt = new Date().toISOString();
  this.saveVouchers(vouchers);
  return true;
},

checkMilestones(totalSpent) {
  const vouchers = this.getVouchers();
  const existingCodes = new Set(vouchers.map(v => v.code));
  let newVouchers = [];
  REWARD_MILESTONES.forEach(m => {
    if (totalSpent >= m.target && !existingCodes.has(m.voucher.code)) {
      newVouchers.push({
        code: m.voucher.code, label: m.voucher.label,
        type: m.voucher.type, value: m.voucher.value,
        max: m.voucher.max || null, milestone: m.target,
        earned: true, used: false, earnedAt: new Date().toISOString()
      });
    }
  });
  if (newVouchers.length > 0) this.saveVouchers([...vouchers, ...newVouchers]);
  return newVouchers;
},

getMilestones() {
  return REWARD_MILESTONES;
}
```

#### Bước 2 — account.html: Thêm CSS styles

Thêm trước `</style>` (dòng ~77):
```css
/* Milestone Tracker */
.milestone-card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
.milestone-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.milestone-header-left { display: flex; align-items: center; gap: 8px; }
.milestone-header-left span { font-size: 1.1rem; }
.milestone-header-left strong { font-size: 0.9rem; font-weight: 700; color: #1a1a1a; }
.milestone-spent { font-size: 0.72rem; color: #6b6b7b; background: rgba(0,0,0,0.04); padding: 4px 10px; border-radius: 8px; }
.milestone-list { display: flex; flex-direction: column; gap: 10px; }
.milestone-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; }
.milestone-item.achieved { background: rgba(26,138,94,0.06); }
.milestone-item.next { background: rgba(168,85,247,0.06); border: 1px dashed rgba(168,85,247,0.2); }
.milestone-item.locked { background: rgba(0,0,0,0.02); opacity: 0.6; }
.milestone-icon { font-size: 1.2rem; flex-shrink: 0; }
.milestone-info { flex: 1; }
.milestone-info-top { display: flex; justify-content: space-between; align-items: center; }
.milestone-target { font-size: 0.8rem; font-weight: 700; color: #1a1a1a; }
.milestone-reward { font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.milestone-item.achieved .milestone-reward { background: rgba(26,138,94,0.1); color: #1a8a5e; }
.milestone-item.next .milestone-reward { background: rgba(168,85,247,0.1); color: #7c3aed; }
.milestone-item.locked .milestone-reward { background: rgba(0,0,0,0.04); color: #9a9aaa; }
.milestone-progress-bar { height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden; margin-top: 4px; }
.milestone-progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #a855f7, #7c3aed); }

/* Voucher Wallet */
.voucher-card { display: flex; align-items: stretch; border-radius: 12px; overflow: hidden; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.voucher-card.available { border: 1px solid rgba(26,138,94,0.2); }
.voucher-card.used { border: 1px solid rgba(0,0,0,0.06); opacity: 0.6; }
.voucher-left { width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 8px; }
.voucher-card.available .voucher-left { background: linear-gradient(135deg, #1a8a5e, #15803d); color: #fff; }
.voucher-card.used .voucher-left { background: #e5e5e5; color: #999; }
.voucher-left .voucher-value { font-size: 1.1rem; font-weight: 900; }
.voucher-right { flex: 1; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; background: #fff; }
.voucher-code { font-size: 0.82rem; font-weight: 700; font-family: 'Inter', monospace; }
.voucher-desc { font-size: 0.7rem; color: #6b6b7b; margin-top: 2px; }
.voucher-status { font-size: 0.68rem; margin-top: 3px; font-weight: 600; }
.voucher-card.available .voucher-status { color: #1a8a5e; }
.voucher-card.used .voucher-status { color: #999; }
.voucher-copy-btn { padding: 6px 12px; border: 1px solid rgba(26,138,94,0.2); border-radius: 8px; background: rgba(26,138,94,0.06); color: #1a8a5e; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
```

#### Bước 3 — account.html: Thêm HTML sections vào renderAccount()

Trong `renderAccount()`, sau section "Quyền lợi hạng" (đóng `</div>` section-card), thêm:

**3a. 🎯 Mục Tiêu Thưởng** — Render 5 mốc chi tiêu từ `Auth.getMilestones()`, mỗi mốc hiển thị:
- icon: ✅ (đạt) / 🔥 (đang tiến tới = next) / 🔒 (chưa tới)
- target (VNĐ) và voucher label
- Mốc "next" có progress bar (tính % từ mốc trước đến mốc hiện tại)

**3b. 🎟️ Voucher Của Tôi** — Render voucher từ `Auth.getVouchers()`:
- Mỗi voucher: left panel (giá trị %), right panel (code, label, status, nút Copy)
- Nếu chưa có voucher: "Mua hàng để mở khoá voucher giảm giá 🎁"

**3c.** Thêm helper function `copyVoucherCode(code, btn)` dùng `navigator.clipboard.writeText()`.

#### Bước 4 — order-form.html: Tích hợp voucher loyalty

**4a.** Trong `applyVoucher()`, đổi `const v = VOUCHERS[code]` thành `let v = VOUCHERS[code]` rồi thêm:
```javascript
let isLoyalty = false;
if (!v && window.BeaPop && window.BeaPop.Auth) {
  const loyaltyV = window.BeaPop.Auth.findVoucher(code);
  if (loyaltyV) {
    v = { label: loyaltyV.label, type: loyaltyV.type, value: loyaltyV.value, max: loyaltyV.max };
    isLoyalty = true;
  }
}
```

**4b.** Lưu thêm `activeVoucher._isLoyalty = isLoyalty` và `activeVoucher._code = code`.

**4c.** Sau đặt hàng thành công (sau `localStorage.removeItem('kbeauty_cart')`):
```javascript
if (activeVoucher && activeVoucher._isLoyalty && window.BeaPop && window.BeaPop.Auth) {
  window.BeaPop.Auth.useVoucher(activeVoucher._code);
}
```

#### Bước 5 — order-form.html: Thông báo nudge khi gần đạt mốc

Khi khách add/remove sản phẩm, hiển thị thông báo trong cart bar cho biết còn thiếu bao nhiêu để đạt mốc voucher tiếp theo.

**5a.** Thêm div nudge vào cart bar (trước nút submit):
```html
<div id="milestoneNudge" style="display:none;padding:8px 14px;border-radius:10px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.15);color:#7c3aed;font-size:0.78rem;font-weight:600;margin-bottom:8px;text-align:center;"></div>
```

**5b.** Trong hàm `updateCart()`, sau khi tính `finalTotal`, thêm logic check milestone:
```javascript
// Milestone nudge
const nudgeEl = document.getElementById('milestoneNudge');
if (window.BeaPop && window.BeaPop.Auth && window.BeaPop.Auth.isLoggedIn()) {
  const user = window.BeaPop.Auth.getUser();
  const projectedSpent = (user.totalSpent || 0) + finalTotal;
  const milestones = window.BeaPop.Auth.getMilestones();
  const vouchers = window.BeaPop.Auth.getVouchers();
  const earnedCodes = new Set(vouchers.map(v => v.code));

  // Tìm mốc gần nhất chưa đạt
  let nextMilestone = null;
  for (const m of milestones) {
    if (!earnedCodes.has(m.voucher.code) && projectedSpent < m.target) {
      nextMilestone = m;
      break;
    }
  }

  if (nextMilestone && finalTotal > 0) {
    const remaining = nextMilestone.target - projectedSpent;
    if (remaining > 0 && remaining <= nextMilestone.target * 0.5) {
      // Chỉ hiện khi còn thiếu ≤50% mốc target
      const remainStr = new Intl.NumberFormat('vi-VN').format(remaining) + '₫';
      nudgeEl.textContent = '🎯 Mua thêm ' + remainStr + ' để nhận voucher ' + nextMilestone.voucher.label + '!';
      nudgeEl.style.display = 'block';
    } else {
      nudgeEl.style.display = 'none';
    }
  } else {
    nudgeEl.style.display = 'none';
  }
} else if (nudgeEl) {
  nudgeEl.style.display = 'none';
}
```

**Commit**: `feat(M55): loyalty voucher program — milestone targets with auto-generated discount vouchers`

---

### MISSION 56: Security Hardening Auth (PBKDF2 + Rate Limit + PIN Reset)
**File**: `auth.js` · **Effort**: 2h

**Vấn đề bảo mật hiện tại:**
1. SHA-256 với salt cứng → dễ brute-force
2. Không có rate limiting → thử vô hạn lần
3. Reset password chỉ cần SĐT + tên (công khai) → ai cũng chiếm được
4. Error messages phân biệt USER_NOT_FOUND vs WRONG_PASSWORD → lộ SĐT đã đăng ký

**Yêu cầu:**

**Bước 1 — PBKDF2**: Thay hàm `hashPassword()` từ SHA-256 sang PBKDF2:
```javascript
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  let salt;
  if (saltHex) {
    salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const saltOut = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return saltOut + ':' + hashHex; // "salt:hash"
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex] = stored.split(':');
  return (await hashPassword(password, saltHex)) === stored;
}
```

**Bước 2 — Rate Limiting**: Thêm hệ thống rate limit (dùng `sessionStorage`):
- Key: `beapop_rate_limit`
- MAX_ATTEMPTS = 5, LOCKOUT_MS = 30000 (30s)
- `checkRateLimit(key)` → `{ locked, remaining }`
- `recordFailedAttempt(key)` → lock sau N lần sai
- Áp dụng cho cả login và reset password

**Bước 3 — PIN bảo mật**: Khi đăng ký, yêu cầu thêm mã PIN 4-6 số:
- Thêm field PIN vào register form + register function
- Hash PIN bằng PBKDF2, lưu vào `user.pinHash`
- Reset password yêu cầu SĐT + PIN (thay vì tên)
- Thêm method `Auth.changePin(password, newPin)`

**Bước 4 — Unified errors**: Login sai trả `INVALID_CREDENTIALS` thay vì phân biệt `USER_NOT_FOUND` vs `WRONG_PASSWORD`. Hiển thị "Thông tin đăng nhập không đúng".

**Commit**: `feat(M55): security hardening — PBKDF2, rate-limit, PIN reset`

### MISSION 56: Auto-fill Thông Tin Khách Hàng (Order Form)
**File**: `auth.js`, `order-form.html` · **Effort**: 1h

**Vấn đề:** Khách hàng đã đăng nhập vẫn phải nhập lại tên, SĐT, địa chỉ khi đặt hàng.

**Bước 1 — auth.js**: Thêm method `saveAddress(address)` sau `changePin()`:
```javascript
saveAddress(address) {
  const user = this.getUser();
  if (!user || !address) return;
  user.address = address.trim();
  this.updateProfile(user);
}
```

**Bước 2 — order-form.html**: Thêm badge + auto-fill trước `<!-- Customer Info -->` (dòng ~206):
```html
<div id="autofillBadge" style="display:none;padding:8px 14px;border-radius:10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);color:#059669;font-size:0.78rem;font-weight:500;margin-bottom:14px;text-align:center;">✅ Thông tin đã được điền sẵn từ tài khoản</div>
```

**Bước 3 — JS** (đầu `<script>`, trước PRODUCT DATA):
```javascript
document.addEventListener('DOMContentLoaded', () => {
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
});
```

**Bước 4 — Save address** sau khi submit thành công (dòng ~574, trước `localStorage.removeItem`):
```javascript
if (window.BeaPop && window.BeaPop.Auth.isLoggedIn()) {
  window.BeaPop.Auth.saveAddress(data.address);
}
```

**Commit**: `feat(M57): auto-fill customer info from auth profile`

### MISSION 58: Đổi PIN & Mật Khẩu trong Account Page
**File**: `account.html` · **Effort**: 30'

**Yêu cầu:** Thêm 2 section vào trang account (trước nút Đăng xuất):

**Section 1 — Đổi mật khẩu**: Form có 3 fields: mật khẩu cũ, mới, xác nhận. Gọi `window.BeaPop.Auth.changePassword(oldPwd, newPwd)`.

**Section 2 — Đổi PIN bảo mật**: Form có 2 fields: mật khẩu hiện tại (xác nhận), PIN mới. Gọi `window.BeaPop.Auth.changePin(pwd, newPin)`.

Cả 2 section hiển thị result (success/error) inline.

**Commit**: `feat(M58): change password and PIN in account page`

---

### MISSION 62: COD — Tự Động Tạo Vận Đơn GHN + Khách Tra Cứu
**File**: `tools/telegram_bot.py`, `tracking.html` · **Effort**: 3h · **Sprint**: 12

**Mục tiêu:** Khi admin gõ `/update KB-XXXX shipping`, server tự động tạo vận đơn GHN (chỉ với đơn COD), lưu mã vận đơn vào order, báo Telegram. Khách vào `tracking.html` nhập SĐT tra trạng thái + link GHN.

> **Cần ENV vars trên Railway trước khi làm:**
> ```
> GHN_TOKEN=<token từ khachhang.ghn.vn → Tài khoản → API>
> GHN_SHOP_ID=<shop ID từ GHN dashboard>
> GHN_PROVINCE_ID=<ID tỉnh/TP kho gửi hàng — tra tại /shiip/public-api/master-data/province>
> GHN_DISTRICT_ID=<ID quận/huyện kho>
> GHN_WARD_CODE=<mã phường/xã kho>
> GHN_ADDRESS=<địa chỉ kho cụ thể, ví dụ: "123 Nguyễn Văn A">
> ```

---

#### Bước 1 — `telegram_bot.py`: Thêm class `GHNClient`

Thêm class sau `PayOSClient` (trước `class DataStore`):

```python
class GHNClient:
    """GHN Express API — tạo vận đơn COD tự động."""
    API = "https://online-gateway.ghn.vn/shiip/public-api"

    def __init__(self, token: str, shop_id: str):
        self.token = token
        self.shop_id = str(shop_id)
        self.enabled = bool(token and shop_id and token != "your_ghn_token")

    def create_order(self, order: dict) -> Optional[dict]:
        """Tạo vận đơn GHN, trả về dict với order_code hoặc None."""
        if not self.enabled:
            logger.warning("GHN not configured")
            return None
        payload = {
            "payment_type_id": 2,             # 1=người gửi trả, 2=người nhận (COD)
            "note": order.get("note", ""),
            "required_note": "KHONGCHOXEMHANG",
            "to_name": order.get("name", ""),
            "to_phone": order.get("phone", ""),
            "to_address": order.get("address", ""),
            "to_ward_name": "",
            "to_district_name": "",
            "to_province_name": "",
            "cod_amount": int(order.get("total", 0)) + 25000,  # tiền hàng + phí COD
            "weight": 500,        # gram, mặc định 500g
            "length": 20,         # cm
            "width": 15,
            "height": 10,
            "service_type_id": 2,  # Chuyển phát nhanh
            "items": [
                {"name": order.get("products", "BeaPop Order")[:100],
                 "quantity": 1, "weight": 500}
            ]
        }
        try:
            req = request.Request(
                f"{self.API}/v2/shipping-order/create",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Token": self.token,
                    "ShopId": self.shop_id,
                },
                method="POST"
            )
            with request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                if result.get("code") == 200:
                    return result.get("data")  # chứa order_code, expected_delivery_time
                logger.error(f"GHN error: {result}")
        except Exception as e:
            logger.error(f"GHN create_order error: {e}")
        return None
```

---

#### Bước 2 — `telegram_bot.py`: Wire GHNClient vào `KBeautyBot.__init__`

Sau block khởi tạo `PayOSClient`, thêm:

```python
# GHN Shipping client
self.ghn = GHNClient(
    token=config.get("GHN_TOKEN", ""),
    shop_id=config.get("GHN_SHOP_ID", "")
)
if self.ghn.enabled:
    logger.info("GHN shipping: ENABLED ✓")
else:
    logger.warning("GHN not configured — set GHN_TOKEN, GHN_SHOP_ID in .env")
WebhookHandler.ghn = self.ghn
WebhookHandler.ghn_config = {
    "province_id": config.get("GHN_PROVINCE_ID", ""),
    "district_id": config.get("GHN_DISTRICT_ID", ""),
    "ward_code": config.get("GHN_WARD_CODE", ""),
    "address": config.get("GHN_ADDRESS", ""),
}
```

Thêm vào class `WebhookHandler` (cùng chỗ khai báo class attributes):
```python
ghn: Optional[Any] = None       # GHNClient instance
ghn_config: dict = {}
```

---

#### Bước 3 — `telegram_bot.py`: Auto-tạo GHN khi `/update KB-XXXX shipping`

Trong hàm `_handle_command()`, tìm đoạn xử lý `/update` (khoảng dòng 1080-1100):

```python
elif cmd == "/update" and is_admin:
    # Existing code: update_order_status(...)
    ...
```

Sau khi `update_order_status` thành công và `new_status == "shipping"`, thêm block:

```python
# Nếu đơn COD → tự động tạo vận đơn GHN
if new_status == "shipping" and WebhookHandler.ghn and WebhookHandler.ghn.enabled:
    order = self.store.get_order_by_id(order_id)
    if order and order.get("paymentMethod") == "cod":
        ghn_result = WebhookHandler.ghn.create_order(order)
        if ghn_result:
            mvd = ghn_result.get("order_code", "")
            delivery = ghn_result.get("expected_delivery_time", "")
            # Lưu mã vận đơn vào order
            self.store.update_order_status(order_id, "shipping")  # already set, just to attach mvd
            orders = self.store._read_json(self.store.orders_file)
            if isinstance(orders, list):
                for o in orders:
                    if o.get("orderId") == order_id:
                        o["ghnOrderCode"] = mvd
                        o["estimatedDelivery"] = delivery
                        self.store._write_json(self.store.orders_file, orders)
                        break
            response = (
                f"✅ Vận đơn GHN đã tạo!\n"
                f"📦 Đơn: `{order_id}`\n"
                f"🔖 MVD: `{mvd}`\n"
                f"🚚 Dự kiến giao: {delivery[:10] if delivery else 'N/A'}"
            )
        else:
            response += "\n⚠️ Không tạo được vận đơn GHN — thêm thủ công."
```

---

#### Bước 4 — `tracking.html`: Trang tra cứu đơn hàng cho khách

Tạo file `tracking.html` mới (copy head/nav/footer từ `catalog.html`).

**Logic JS:**
1. Form nhập SĐT → gọi `GET /api/orders?phone=0901234567`
2. Hiển thị danh sách đơn của số điện thoại đó
3. Mỗi đơn: timeline 4 bước + mã GHN + link tra cứu

**UI timeline:**
```
🟡 Chờ xử lý → 🔵 Đang giao → ✅ Hoàn thành
             ↘ ❌ Đã huỷ
```

**HTML chính:**
```html
<div class="tracking-wrap">
  <h1>📦 Tra Cứu Đơn Hàng</h1>
  <div class="track-form">
    <input type="tel" id="trackPhone" placeholder="Nhập số điện thoại đặt hàng...">
    <button onclick="searchOrders()">🔍 Tra cứu</button>
  </div>
  <div id="trackResult"></div>
</div>
```

**JS `searchOrders()`:**
```javascript
async function searchOrders() {
  const phone = document.getElementById('trackPhone').value.replace(/\D/g,'');
  if (!phone || phone.length < 9) { showError('Nhập SĐT 10 số'); return; }
  const _API = 'https://web-production-46a5.up.railway.app';
  const res = await fetch(`${_API}/api/orders?phone=${phone}`);
  const orders = await res.json();
  if (!orders || !orders.length) {
    document.getElementById('trackResult').innerHTML = '<p>Không tìm thấy đơn hàng nào.</p>';
    return;
  }
  document.getElementById('trackResult').innerHTML = orders.map(o => renderOrder(o)).join('');
}

function renderOrder(o) {
  const STATUS_MAP = {
    pending: { label: 'Chờ xử lý', color: '#f59e0b', step: 0 },
    confirmed: { label: 'Đã xác nhận', color: '#3b82f6', step: 1 },
    shipping: { label: 'Đang giao', color: '#8b5cf6', step: 2 },
    completed: { label: 'Hoàn thành', color: '#10b981', step: 3 },
    cancelled: { label: 'Đã huỷ', color: '#ef4444', step: -1 },
  };
  const s = STATUS_MAP[o.status] || STATUS_MAP.pending;
  const steps = ['Đặt hàng', 'Xác nhận', 'Đang giao', 'Hoàn thành'];
  const ghnLink = o.ghnOrderCode
    ? `<a href="https://donhang.ghn.vn/?order_code=${o.ghnOrderCode}" target="_blank">🔗 Tra GHN: ${o.ghnOrderCode}</a>`
    : '';
  return `
    <div class="order-card">
      <div class="order-header">
        <strong>${o.orderId}</strong>
        <span style="color:${s.color}">${s.label}</span>
      </div>
      <div class="order-products">${o.products || ''}</div>
      <div class="order-total">${(o.total||0).toLocaleString('vi')}₫ · ${o.paymentMethod === 'cod' ? 'COD' : 'Đã thanh toán'}</div>
      <div class="order-timeline">
        ${steps.map((st, i) => `<div class="step ${i <= s.step ? 'done' : ''}"><span>${i<=s.step?'✓':i+1}</span>${st}</div>`).join('<div class="step-line"></div>')}
      </div>
      ${ghnLink}
    </div>
  `;
}
```

**Style tracking (light theme, giống catalog.html):**
- `.tracking-wrap`: max-width 640px, margin 0 auto, padding 30px 16px
- `.track-form`: display flex, gap 8px, margin-bottom 24px
- `.order-card`: background #fff, border-radius 16px, padding 20px, margin-bottom 16px, box-shadow 0 2px 10px rgba(0,0,0,0.06)
- `.order-timeline`: display flex, align-items center, margin-top 16px
- `.step.done`: background #1a8a5e, color #fff, border-radius 50%

#### Bước 5 — `telegram_bot.py`: Thêm filter phone vào GET /api/orders

Trong `do_GET`, đoạn xử lý `/api/orders`, thêm filter:
```python
phone_filter = params.get('phone', [''])[0]
if phone_filter:
    orders = [o for o in orders if o.get('phone','').replace(' ','') == phone_filter]
```

#### Bước 6 — Cập nhật `.env` + Railway env vars
```bash
railway variables set GHN_TOKEN=xxx GHN_SHOP_ID=xxx GHN_PROVINCE_ID=201 GHN_DISTRICT_ID=1490 GHN_WARD_CODE=1A0101 GHN_ADDRESS="123 Đường ABC"
```

**Commit**: `feat(M62): COD auto-GHN shipping + customer order tracking page`

---

## 📋 THỨ TỰ THỰC HIỆN

| # | Mission | Effort | Sprint |
|:--|:--------|:-------|:-------|
| 1 | M45 Filter | 1.5h | 4A |
| 2 | M4 Social | 30' | 4A |
| 3 | M46 Tracking | 2h | 4A |
| 4 | M47 Blog | 3h | 5 |
| 5 | M48 PWA | 1.5h | 5 |
| 6 | M49 i18n | 4h | 6 |
| 7 | M50 Analytics | 3h | 6 |
| 8 | M51 Loyalty | 3h | 6 |
| 9 | M52 Drip Campaign | 2h | 7 |
| 10 | M53 Popup Light Theme | 1h | 8 |
| 11 | M54 Order Form Light Theme | 1h | 8 |
| 12 | M55 Voucher Thưởng | 3h | 9 |
| 13 | M56 Security Hardening | 2h | 10 |
| 14 | M57 Auto-fill Order Form | 1h | 10 |
| 15 | M58 Change PIN Account | 30' | 10 |
| 16 | M59 PayOS Success Banner | 2h | 11 |
| 17 | **M62 COD GHN + Tracking** | **3h** | **12** |

**Tổng còn lại**: ~34h

---

## 🛡️ SPRINT 13 — Security & Refactoring
 
 ### MISSION 64: Admin Authentication (Token-based)
 **File**: `login.html` [NEW], `admin.html`, `tools/telegram_bot.py` · **Effort**: 2h
 
 **Yêu cầu:** Gắn luồng đăng nhập vào Admin Dashboard để chặn người ngoài.
 - Tạo `login.html` với form password.
 - Code Endpoint `POST /api/admin/login` trong `WebhookHandler` trả JWT hoặc Token.
 - `admin.html` tự check `sessionStorage.getItem('admin_token')` và gửi via Header `Authorization`.
 - Thêm middleware chặn API PUT/POST nếu thiếu `Authorization`.
 
 **Commit**: `feat(M64): admin dashboard password authentication system`
 
 ### MISSION 65: Tách module cho Admin Dashboard
 **File**: `admin.html`, `src/admin/` [NEW] · **Effort**: 3h
 
 **Yêu cầu:** Tách `admin.html` (>1000 dòng):
 - Đưa Logic Tab Orders vào `admin-orders.js`.
 - Đưa Logic Tab Analytics/Loyalty vào `admin-analytics.js`.
 - Đưa Logic Tab Stock vào `admin-stock.js`.
 - Import qua `admin.js`.
 
 **Commit**: `refactor(M65): split monolithic admin.html into separate js modules`
 
 ### MISSION 66: Testing
 **File**: `tests/` [NEW] · **Effort**: 3h
 
 **Yêu cầu:**
 - **Pytest:** `tests/test_api.py` kiểm tra API backend.
 - **Playwright:** `tests/e2e/order.spec.js` kiểm tra End-to-End luồng đặt hàng.
 
 **Commit**: `test(M66): implement pytest for backend and playwright e2e for order flow`
 
 ---
 
 ## Sprint 14 — Cleanup & Stabilize
 
 ### MISSION 67 — Xóa class DataStore cũ (Code Dead)
 
 **File:** `tools/telegram_bot.py`
 
 **Yêu cầu:**
 - Xóa toàn bộ class `DataStore` (dòng ~236 đến ~529) — class này đã được thay thế bởi `SqliteStore` trong `tools/db.py`
 - Kiểm tra không còn chỗ nào import hoặc gọi `DataStore` — nếu còn thì sửa sang `SqliteStore`
 - Chạy `python3 -c "import py_compile; py_compile.compile('telegram_bot.py', doraise=True)"` để verify syntax
 
 **Commit**: `refactor(M67): remove deprecated DataStore class, fully using SqliteStore`
 
 ---
 
 ### MISSION 68 — Thêm Test Step vào GitHub Actions CI
 
 **File:** `.github/workflows/deploy.yml`
 
 **Yêu cầu:**
 - Thêm job `test` chạy trước job `deploy`
 - Job test: checkout code → setup Python 3.11 → `pip install pytest` → `cd tools && python3 -m pytest ../tests/ -v`
 - Job deploy phụ thuộc (`needs: test`) để chỉ deploy khi test pass
 
 **Commit**: `ci(M68): add pytest step to github actions before deploy`
 
 ---
 
 ### MISSION 69 — Tạo DEPLOY.md hướng dẫn Railway Volume
 
 **File:** `DEPLOY.md` (mới)
 
 **Yêu cầu:**
 - Hướng dẫn mount Persistent Volume trên Railway:
   1. Railway Dashboard → Project → Add Volume
   2. Mount path: `/data`
   3. Set env var: `DB_PATH=/data/shop.db`
 - Hướng dẫn set `ADMIN_PASSWORD` trên Railway env vars
 - Hướng dẫn deploy Cloudflare Pages (frontend)
 
 **Commit**: `docs(M69): add DEPLOY.md with Railway volume and env setup guide`
 
 ---
 
 ### MISSION 70 — Dọn dẹp stock.json root
 
 **File:** `stock.json` (root)
 
 **Yêu cầu:**
 - File `stock.json` ở root hiện là `[]` rỗng — đã chuyển sang SQLite
 - Thêm comment vào `README.md` hoặc xóa file nếu không còn chỗ nào reference
 - Kiểm tra `telegram_bot.py` và `db.py` không còn đọc trực tiếp file này
 
 **Commit**: `chore(M70): cleanup legacy stock.json, data now in SQLite`
 
 ---
 
 ## 🟤 SPRINT 15 — System Tools
 
 ### MISSION 71: RAM Monitor Dashboard (Tauri Desktop App)
 **Thư mục**: `apps/ram-monitor/` (đã có Tauri template) · **Effort**: 3h
 
 **Bối cảnh:** Thư mục `apps/ram-monitor/` đã được khởi tạo bằng `create-tauri-app` (Rust + Vanilla JS). Hiện tại vẫn là template mặc định "Welcome to Tauri" với hàm `greet()`. Crate `sysinfo = "0.38.4"` đã có trong `Cargo.toml`. Cần biến nó thành app giám sát RAM thời gian thực.
 
 **Yêu cầu Worker thực hiện:**
 
 #### Bước 1 — Rust Backend: Thêm Tauri Commands (`src-tauri/src/lib.rs`)
 
 Xoá hàm `greet()`, thay bằng 3 commands dùng crate `sysinfo`:
 
 ```rust
 use sysinfo::System;
 use serde::Serialize;
 
 #[derive(Serialize)]
 struct SystemInfo {
     total_memory: u64,      // bytes
     used_memory: u64,
     free_memory: u64,
     percent: f64,
 }
 
 #[derive(Serialize)]
 struct ProcessInfo {
     pid: u32,
     name: String,
     ram_mb: f64,
     ram_bytes: u64,
     cpu_percent: f32,
     status: String,
 }
 
 #[derive(Serialize)]
 struct ProcessList {
     processes: Vec<ProcessInfo>,
     count: usize,
 }
 
 #[tauri::command]
 fn get_system_info() -> SystemInfo {
     let mut sys = System::new_all();
     sys.refresh_memory();
     let total = sys.total_memory();
     let used = sys.used_memory();
     SystemInfo {
         total_memory: total,
         used_memory: used,
         free_memory: total - used,
         percent: (used as f64 / total as f64) * 100.0,
     }
 }
 
 #[tauri::command]
 fn get_processes() -> ProcessList {
     let mut sys = System::new_all();
     sys.refresh_all();
     let mut processes: Vec<ProcessInfo> = sys.processes().values()
         .filter_map(|p| {
             let ram = p.memory();
             let ram_mb = ram as f64 / (1024.0 * 1024.0);
             if ram_mb < 1.0 { return None; }
             Some(ProcessInfo {
                 pid: p.pid().as_u32(),
                 name: p.name().to_string_lossy().to_string(),
                 ram_mb: (ram_mb * 10.0).round() / 10.0,
                 ram_bytes: ram,
                 cpu_percent: p.cpu_usage(),
                 status: format!("{:?}", p.status()),
             })
         })
         .collect();
     processes.sort_by(|a, b| b.ram_bytes.cmp(&a.ram_bytes));
     let count = processes.len();
     ProcessList { processes, count }
 }
 
 #[tauri::command]
 fn kill_process(pid: u32) -> Result<String, String> {
     let sys = System::new_all();
     let pid = sysinfo::Pid::from_u32(pid);
     if let Some(process) = sys.process(pid) {
         let name = process.name().to_string_lossy().to_string();
         // Protect critical processes
         let protected = ["kernel_task", "launchd", "WindowServer", "loginwindow"];
         if protected.contains(&name.as_str()) {
             return Err(format!("Cannot kill protected process: {}", name));
         }
         if process.kill() {
             Ok(format!("Killed {} (PID: {})", name, pid))
         } else {
             Err(format!("Failed to kill {} (PID: {})", name, pid))
         }
     } else {
         Err(format!("Process {} not found", pid))
     }
 }
 ```
 
 Cập nhật `invoke_handler`:
 ```rust
 .invoke_handler(tauri::generate_handler![get_system_info, get_processes, kill_process])
 ```
 
 #### Bước 2 — Frontend: Dashboard HTML (`src/index.html`)
 
 Xoá toàn bộ nội dung Welcome to Tauri, thay bằng:
 - **Header**: Logo + "RAM Monitor" + badge "● Live" + dropdown chọn refresh rate (1s/2s/5s) + nút Pause
 - **System Overview** (4 cards): Tổng RAM 💾 | Đang dùng 🔥 | Còn trống ✅ | Gauge tròn (SVG circle) hiển thị %
 - **RAM Bar**: Thanh progress bar ngang phân bổ bộ nhớ (used vs free)
 - **Process Table**: Bảng tiến trình với cột: Tên ứng dụng | PID | RAM (MB) | CPU % | Trạng thái | Nút Kill ❌
   - Search box tìm tiến trình theo tên
   - Sort theo RAM giảm dần (ngốn nhiều nhất lên đầu)
 - **Kill Confirm Modal**: Popup xác nhận trước khi kill ("Bạn có chắc muốn tắt X?")
 - **Toast notifications**: Thông báo sau khi kill thành công/thất bại
 
 #### Bước 3 — Frontend: Dark Glassmorphism CSS (`src/styles.css`)
 
 Xoá CSS cũ, tạo theme mới:
 - **Nền tối**: `#0a0a1a`, font `Inter` từ Google Fonts
 - **Glass cards**: `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255,255,255,0.06)`
 - **Gradient accent**: tím-xanh (`#6366f1` → `#8b5cf6`)
 - **Gauge SVG**: Circle với `stroke-dasharray` animation
 - **RAM Bar**: gradient xanh→vàng→đỏ theo mức sử dụng
 - **Table**: hover rows highlight, zebra striping subtle
 - **Animations**: smooth transition trên progress bars, fade-in cho table rows
 - **Responsive**: hoạt động tốt ở kích thước cửa sổ nhỏ
 
 #### Bước 4 — Frontend: JavaScript Logic (`src/main.js`)
 
 Xoá code `greet()`, thay bằng:
 ```javascript
 const { invoke } = window.__TAURI__.core;
 
 let refreshInterval = null;
 let isPaused = false;
 let sortField = 'ram_bytes';
 let searchQuery = '';
 
 async function fetchSystemInfo() {
     const info = await invoke('get_system_info');
     // Update cards: totalRam, usedRam, freeRam
     // Update gauge SVG (stroke-dashoffset theo percent)
     // Update RAM bar width
 }
 
 async function fetchProcesses() {
     const data = await invoke('get_processes');
     // Filter theo searchQuery
     // Render table rows với nút Kill
     // Update process count badge
 }
 
 async function killProcess(pid, name) {
     // Hiện modal xác nhận
     // Nếu confirm → invoke('kill_process', { pid })
     // Hiện toast kết quả
 }
 
 function startRefresh(ms) {
     if (refreshInterval) clearInterval(refreshInterval);
     refreshInterval = setInterval(() => {
         if (!isPaused) { fetchSystemInfo(); fetchProcesses(); }
     }, ms);
 }
 
 // Init: fetch lần đầu + start auto-refresh 2s
 window.addEventListener('DOMContentLoaded', () => {
     fetchSystemInfo();
     fetchProcesses();
     startRefresh(2000);
 });
 ```
 
 #### Bước 5 — Cấu hình Tauri (`src-tauri/tauri.conf.json`)
 - Đổi `title` thành `"RAM Monitor"`
 - Set `width: 900`, `height: 650`
 - Set `alwaysOnTop: true` (luôn hiện ngoài màn hình)
 - Set `decorations: true`, `resizable: true`
 - Set `transparent: false`
 
#### Bước 6 — Auto-Optimize: Tự động tắt phần mềm khi quá tải RAM

**Rust Backend** — Thêm command `auto_optimize` vào `lib.rs`:
- Struct `OptimizeResult { killed, freed_mb, message }`
- Const `SAFE_TO_KILL`: TextEdit, Preview, Notes, Calculator, QuickTime Player, Music, Podcasts, Books, Maps, FaceTime, Messages, Mail
- Const `NEVER_KILL`: kernel_task, launchd, WindowServer, loginwindow, Finder, Dock, SystemUIServer, Terminal, claude
- Command `auto_optimize(threshold: f64) -> OptimizeResult`:
  1. Kiểm tra RAM % vs threshold → nếu dưới ngưỡng thì return "không cần tối ưu"
  2. Lọc process trong SAFE_TO_KILL, sort theo RAM giảm dần
  3. Kill từng app cho đến khi RAM giảm xuống threshold - 10%
  4. Return danh sách app đã tắt + MB giải phóng
- Cập nhật `invoke_handler` thêm `auto_optimize`

**Frontend HTML** — Thêm vào dashboard:
- Toggle switch "🤖 Auto-Optimize" (bật/tắt) + slider chọn ngưỡng RAM (60%-95%, mặc định 85%)
- Nút "⚡ Tối ưu ngay" chạy optimize thủ công
- Hiện danh sách app đã tắt trong toast notification

**Frontend JS** — Thêm vào `main.js`:
- `autoOptimize = false`, `ramThreshold = 85`
- `runOptimize()`: gọi `invoke("auto_optimize", { threshold })`, hiện toast
- `checkAutoOptimize()`: trong auto-refresh loop, nếu bật + RAM >= threshold → gọi runOptimize()

#### Bước 7 — Build & Test
 ```bash
 cd apps/ram-monitor
 pnpm install
 pnpm tauri dev
 ```
 - Xác nhận dashboard hiển thị đúng process list
 - Xác nhận RAM usage khớp Activity Monitor
 - Thử kill 1 process test (mở TextEdit rồi kill)
 - Xác nhận auto-refresh hoạt động
 
- Bật Auto-Optimize → mở nhiều app → kiểm tra tự động tắt khi vượt ngưỡng 85%
**Commit**: `feat(M71): RAM Monitor desktop app — real-time monitoring + auto-optimize RAM`
 
 ---
 
 ## 🚀 LỆNH DISPATCH

```bash
# Sprint 4A (ưu tiên):
mekong run -p "Đóng vai Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 4A: M62 (Sửa lỗi Service Worker PWA), M63 (Tạo trang Đăng ký Tester tester.html), M45 (filter), M4 (social), M46 (tracking page). Làm theo đúng thứ tự. Mỗi mission commit riêng. Xong deploy."

# Sprint 5:
mekong run -p "Đóng vai Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 5: M47 (blog), M48 (PWA). Mỗi mission commit riêng. Xong deploy."

# Sprint 6:
mekong run -p "Đóng vai Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 6: M49 (i18n), M50 (analytics), M51 (loyalty). Mỗi mission commit riêng. Xong deploy."

# Sprint 7 (Automation):
mekong run -p "Đóng vai Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 7: M52 (Drip Campaign). Đọc file tools/telegram_bot.py và bổ sung luồng chạy ngầm. Commit riêng. Xong chạy test."

# Sprint 8 (UI Polish):
mekong run -p "Đóng vai Frontend Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 8: M53 (Popup Light Theme) + M54 (Order Form Light Theme). File cần sửa: catalog.html dòng 904-946 và order-form.html. Thay toàn bộ màu dark thành light palette. Mỗi mission commit riêng. Xong deploy."

# Sprint 9 (Loyalty Voucher):
mekong run -p "Đóng vai Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 9: M55 (Voucher Thưởng theo Mốc Chi Tiêu). Sửa 3 file: auth.js, account.html, order-form.html theo 4 bước trong mission. Commit riêng. Xong deploy."

# Sprint 10 (Auth Security + Auto-fill):
mekong run -p "Đóng vai Security Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 10: M56 (Security Hardening auth.js), M57 (Auto-fill order form), M58 (Đổi PIN account). Làm theo thứ tự M56→M57→M58. Mỗi mission commit riêng. Xong deploy."

# Sprint 11 (PayOS Success Confirm):
mekong run -p "Đóng vai Backend+Frontend Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 11: M59 (PayOS Return URL & Success Banner). Sửa tools/telegram_bot.py: thêm return_url + cancel_url vào CreatePaymentLinkRequest và thêm endpoint GET /api/order-status/:id. Sửa order-form.html: detect ?payment=success param, poll backend, hiện banner xanh xác nhận. Commit riêng. Xong deploy Railway + Cloudflare Pages."

# Sprint 12 (COD GHN + Tracking):
mekong run -p "Đóng vai Backend+Frontend Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 12: M62 (COD GHN Auto-Shipping + Tracking Page). Làm theo đúng 6 bước: (1) thêm class GHNClient vào telegram_bot.py, (2) wire vào KBeautyBot.__init__, (3) auto-tạo GHN khi /update shipping với COD, (4) tạo tracking.html với timeline 4 bước + GHN link, (5) filter /api/orders?phone=xxx, (6) cập nhật .env + Railway env vars GHN_TOKEN GHN_SHOP_ID. Commit riêng. Xong deploy Railway + push GitHub."

# Sprint 14 (Cleanup & Stabilize):
claude -p "Đóng vai Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 14: M67 (Xóa class DataStore cũ trong telegram_bot.py), M68 (Thêm test step vào GitHub Actions), M69 (Tạo DEPLOY.md hướng dẫn Railway Volume), M70 (Dọn stock.json). Làm theo thứ tự. Mỗi mission commit riêng theo format trong file." --allowedTools "Edit,Write,Bash"

# Sprint 15 (System Tools — RAM Monitor):
claude -p "Đóng vai Desktop Engineer. Đọc file cto_dispatch_missions.md. Thực hiện Sprint 15: M71 (RAM Monitor Tauri App). Thư mục apps/ram-monitor/ đã có Tauri template + sysinfo crate. Xoá Welcome to Tauri, thay bằng RAM Dashboard: (1) Rust commands get_system_info + get_processes + kill_process + auto_optimize dùng sysinfo, (2) HTML dashboard dark theme với bảng tiến trình + gauge + kill button + toggle auto-optimize, (3) CSS glassmorphism dark, (4) JS auto-refresh 2s + auto-optimize khi RAM vượt ngưỡng 85%. Set alwaysOnTop:true. Build test bằng pnpm tauri dev. Commit riêng." --allowedTools "Edit,Write,Bash"
```


---

## 🔴 SPRINT 16 — Cải tiến từ k-beauty-order-context.md

### MISSION 72: Fix Analytics + API URL Centralization (Sprint 1 Context)
**Files**: `src/admin/analytics.js`, `src/admin/utils.js`, `catalog.html`, `order-form.html`, `tracking.html`, `chat-widget.js` · **Effort**: 1h

**Vấn đề 1 — analytics.js dùng `this._getOrders` sai:**
Hàm `initAnalytics(getOrders)` gán `this._getOrders = getOrders` nhưng `this` là `undefined` trong non-class context. Kết quả: `loadAnalytics()` và `loadLoyalty()` luôn nhận mảng rỗng → metric hiển thị 0%.

**Bước 1 — Sửa `src/admin/analytics.js`:**
- Thêm biến closure `let _getOrders = () => [];` trên scope module
- Trong `initAnalytics`: đổi `this._getOrders = getOrders` → `_getOrders = getOrders || (() => [])`
- Trong `loadAnalytics()`: đổi `this._getOrders ? this._getOrders() : []` → `_getOrders()`
- Trong `loadLoyalty()`: tương tự
- Trong weekly chart (dòng ~88): đổi `(o.date || '')` → `(o.created_at || '')` (field đúng từ API)

**Vấn đề 2 — API URL hardcode rải rác:**
Railway URL `https://web-production-46a5.up.railway.app` nằm trong 5+ file riêng biệt.

**Bước 2 — Sửa `src/admin/utils.js`:**
```javascript
export const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : (document.querySelector('meta[name="api-url"]')?.content || 'https://web-production-46a5.up.railway.app');
```

**Bước 3 — Sửa `tracking.html`, `catalog.html`, `order-form.html`, `chat-widget.js`:**
Thay tất cả `'https://web-production-46a5.up.railway.app'` hardcode bằng pattern:
```javascript
document.querySelector('meta[name="api-url"]')?.content || 'https://web-production-46a5.up.railway.app'
```

**Commit**: `fix(M72): analytics closure binding, weekly chart field, centralize API URL`
**Deploy**: `wrangler pages deploy . --project-name k-beauty-order`

---

### MISSION 73: SQLite Migration + Railway Persistent Volume (Sprint 2 Context)
**Files**: `tools/telegram_bot.py`, Railway dashboard settings · **Effort**: 3h

**Vấn đề:** Railway dùng ephemeral filesystem — mọi file JSON lưu trên đĩa bị xóa khi restart/redeploy. Data đơn hàng hiện tại lưu trong `data/orders.json` nên bị mất sau mỗi lần deploy.

**Bước 1 — Trong Railway dashboard:**
Vào project → service → Add Volume → Mount path: `/data`

**Bước 2 — Sửa `tools/telegram_bot.py`:**
Update `DB_PATH` để đọc từ env var:
```python
DB_PATH = os.environ.get('DB_PATH', '/data/shop.db')
```

**Bước 3 — Kiểm tra `init_db()`** đã có schema đủ các bảng: `orders`, `inventory`, `inventory_history`. Nếu thiếu, thêm vào.

**Bước 4 — Thêm Railway env var:**
```
DB_PATH=/data/shop.db
```
Dùng `railway variables --set DB_PATH=/data/shop.db`

**Bước 5 — Verify:** Deploy và check log xem SQLite file tạo thành công tại `/data/shop.db`

**Commit**: `fix(M73): sqlite db path from env var for railway persistent volume`
**Deploy**: `railway up --detach` từ project root

---

### MISSION 74: Verify Admin Authentication Backend (Sprint 3 Context)
**Files**: `tools/telegram_bot.py`, `login.html` · **Effort**: 1h

**Vấn đề:** `admin.html` chuyển hướng về `login.html` nếu không có token, nhưng cần kiểm tra endpoint `POST /api/admin/login` trên backend có hoạt động không và token có được verify đúng không.

**Bước 1 — Kiểm tra `tools/telegram_bot.py`:**
Tìm route xử lý `/api/admin/login`. Nếu chưa có, thêm vào:
```python
# POST /api/admin/login
if path == '/api/admin/login' and method == 'POST':
    body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
    password = body.get('password', '')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin')
    if password == admin_password:
        import hashlib, time
        token = hashlib.sha256(f"{admin_password}{int(time.time()//3600)}".encode()).hexdigest()
        self._send_json({'token': token})
    else:
        self._send_json({'error': 'Sai mật khẩu'}, 401)
    return
```

**Bước 2 — Set Railway env var:**
```
railway variables --set ADMIN_PASSWORD=<mật khẩu mong muốn>
```

**Bước 3 — Test thủ công:**
```bash
curl -X POST https://web-production-46a5.up.railway.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}'
```
Nếu trả về `{"token":"..."}` là OK.

**Bước 4 — Kiểm tra `login.html`:** Đảm bảo khi login thành công, token được lưu vào `sessionStorage` với key `admin_token` và chuyển về `admin.html`.

**Commit**: `feat(M74): verify and fix admin login endpoint with env-based password`
**Deploy**: `railway up --detach` từ project root

---

## 🚀 Dispatch Commands Sprint 16

# Sprint 16 Fix 1 (Analytics + API URL):
claude -p "Đóng vai Frontend Engineer. Đọc file cto_dispatch_missions.md. Thực hiện MISSION 72: Fix Analytics closure binding, weekly chart field, centralize API URL. Làm theo đúng 3 bước. Commit riêng. Xong deploy Cloudflare Pages bằng lệnh wrangler pages deploy . --project-name k-beauty-order." --allowedTools "Edit,Write,Bash"

# Sprint 16 Fix 2 (SQLite Volume):
claude -p "Đóng vai Backend Engineer. Đọc file cto_dispatch_missions.md. Thực hiện MISSION 73: SQLite Migration + Railway Persistent Volume. Làm theo 5 bước. Commit riêng. Xong deploy Railway từ project root." --allowedTools "Edit,Write,Bash"

# Sprint 16 Fix 3 (Admin Auth):
claude -p "Đóng vai Security Engineer. Đọc file cto_dispatch_missions.md. Thực hiện MISSION 74: Verify Admin Authentication Backend. Làm theo 4 bước. Commit riêng. Xong deploy Railway từ project root." --allowedTools "Edit,Write,Bash"
