# K-Beauty Order — Context & Improvement Brief

> Dùng file này làm system prompt / context khi nhờ AI cải tiến dự án.
> Repo: https://github.com/tothihaiau0101-code/k-beauty-order

---

## 1. Tổng quan dự án

**Tên:** BeaPop — Shop order mỹ phẩm & album K-Beauty / K-Pop  
**Mô tả:** Hệ thống đặt hàng online cho shop bán lẻ mỹ phẩm Hàn Quốc và album K-Pop.  
**Deploy:** Railway (backend Python) + Netlify/static (frontend HTML)

### Stack hiện tại
| Layer | Công nghệ |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, dark theme, PWA (Service Worker, manifest.json) |
| Backend | Python 3 stdlib only (không dùng framework), REST API thủ công |
| Database | File JSON (`stock.json`, `data/*.json`) — **cần thay thế** |
| Notification | Telegram Bot |
| Deploy | Railway (backend), Procfile + nixpacks.toml |
| CI/CD | GitHub Actions (`.github/workflows/`) |

### Cấu trúc file chính
```
/
├── index.html          # Trang chủ PWA
├── catalog.html        # Danh sách sản phẩm
├── order-form.html     # Form đặt hàng
├── cart.html           # Giỏ hàng
├── admin.html          # Dashboard quản trị (1079 dòng, 51.9 KB)
├── account.html        # Tài khoản khách hàng
├── tracking.html       # Theo dõi đơn hàng
├── reviews.html        # Đánh giá
├── blog.html           # Blog
├── auth.js             # Authentication JS
├── chat-widget.js      # Widget chat
├── styles.css          # CSS toàn bộ app
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── stock.json          # DB tồn kho (hiện = [] rỗng)
├── tools/
│   └── telegram_bot.py # Backend Python + Telegram bot
├── data/               # JSON files lưu đơn hàng
├── src/                # Source JS modules
└── .github/workflows/  # CI/CD
```

### Tính năng hiện có
- Catalog sản phẩm với filter/search
- Form đặt hàng tương tác
- Giỏ hàng
- Admin dashboard với 5 tab: Đơn hàng / Tồn kho / Khách hàng / Analytics / Tích điểm
- KPI cards, biểu đồ doanh thu theo tháng
- Quản lý tồn kho: nhập/xuất + lịch sử
- Loyalty program (tích điểm, phân hạng Bronze/Silver/Gold/VIP)
- Telegram bot thông báo đơn mới
- Export CSV đơn hàng
- PWA: cài app, offline support
- Auto-refresh mỗi 30 giây

---

## 2. Các Bug Nghiêm Trọng Cần Sửa

### BUG 1 — Analytics & Loyalty đọc localStorage thay vì API (CRITICAL)

**Vấn đề:** Tab Analytics và Loyalty trong `admin.html` đọc data từ `localStorage.getItem('kb_orders')` — nhưng key này **không bao giờ được set ở đâu cả**. Trong khi đó, đơn hàng thực tế lưu trên Railway server và được fetch qua API ở các tab khác.

**Hậu quả:** Toàn bộ metric Analytics (conversion rate, top products, weekly chart) và bảng Loyalty luôn hiển thị 0% và rỗng — dữ liệu hoàn toàn vô nghĩa.

**Code sai hiện tại:**
```javascript
// ❌ admin.html - loadAnalytics()
function loadAnalytics() {
    const orders = JSON.parse(localStorage.getItem('kb_orders') || '[]');
    // ... tính toán trên mảng rỗng
}

// ❌ admin.html - loadLoyalty()
function loadLoyalty() {
    const orders = JSON.parse(localStorage.getItem('kb_orders') || '[]');
    // ... tính toán trên mảng rỗng
}
```

**Fix cần làm:** Thay `localStorage.getItem('kb_orders')` bằng biến `allOrders` đã được fetch từ API bởi hàm `loadData()`. Biến `allOrders` là global array, được cập nhật mỗi 30 giây.

```javascript
// ✅ Fix đúng
function loadAnalytics() {
    const orders = allOrders; // dùng data đã có từ API, không fetch lại
    const total = orders.length || 1;

    const completed = orders.filter(o => o.status === 'completed').length;
    document.getElementById('convRate').textContent =
        Math.round(completed / total * 100) + '%';

    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const shipped = orders.filter(
        o => o.status === 'shipping' || o.status === 'completed'
    ).length;
    document.getElementById('deliveryRate').textContent =
        shipped ? Math.round(completed / shipped * 100) + '%' : '—';

    document.getElementById('cancelRate').textContent =
        Math.round(cancelled / total * 100) + '%';

    const revenue = orders.reduce(
        (s, o) => s + parseFloat(o.total || o.total_amount || 0), 0
    );
    document.getElementById('avgOrder').textContent =
        Math.round(revenue / total).toLocaleString('vi') + '₫';

    // Top products
    const prod = {};
    orders.forEach(o =>
        (o.items || []).forEach(it => {
            prod[it.name] = (prod[it.name] || 0) + (it.qty || 1);
        })
    );
    const sorted = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topEl = document.getElementById('topProducts');
    topEl.innerHTML = sorted.length
        ? sorted.map((p, i) => {
            const pct = Math.round(p[1] / (sorted[0][1] || 1) * 100);
            return `<div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
                    <span>${i + 1}. ${p[0]}</span>
                    <span style="color:#a855f7;font-weight:700;">${p[1]} sold</span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,.05);border-radius:3px;margin-top:4px;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#a855f7,#ec4899);border-radius:3px;"></div>
                </div>
            </div>`;
          }).join('')
        : '<p style="color:var(--text-secondary);font-size:0.82rem;">Chưa có dữ liệu</p>';

    // Weekly chart — created_at từ API là ISO string
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('vi', { weekday: 'short' });
        const count = orders.filter(
            o => (o.created_at || '').slice(0, 10) === key
        ).length;
        days.push({ label, count });
    }
    const maxD = Math.max(...days.map(d => d.count), 1);
    document.getElementById('weeklyChart').innerHTML = days.map(d => {
        const h = Math.round(d.count / maxD * 120);
        return `<div style="flex:1;text-align:center;">
            <div style="height:${h || 4}px;background:linear-gradient(180deg,#a855f7,#7c3aed);border-radius:4px 4px 0 0;margin:0 auto;width:70%;min-height:4px;"></div>
            <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:6px;">${d.label}</div>
            <div style="font-size:0.7rem;color:#a855f7;font-weight:700;">${d.count}</div>
        </div>`;
    }).join('');
}

function loadLoyalty() {
    const orders = allOrders;
    const cust = {};
    orders.forEach(o => {
        const key = o.phone || o.name || 'Unknown';
        if (!cust[key]) cust[key] = {
            name: o.name || o.customer_name || 'N/A',
            phone: o.phone || 'N/A',
            spent: 0
        };
        cust[key].spent += parseFloat(o.total || o.total_amount || 0);
    });

    const list = Object.values(cust).sort((a, b) => b.spent - a.spent);
    const body = document.getElementById('loyaltyBody');

    if (!list.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-secondary);">Chưa có dữ liệu</td></tr>';
        return;
    }

    body.innerHTML = list.map(c => {
        const pts = Math.floor(c.spent / 10000);
        const tier = pts >= 200 ? ['💎 VIP',  'tier-gold']
                   : pts >= 100 ? ['🥇 Gold',  'tier-gold']
                   : pts >= 50  ? ['🥈 Silver','tier-silver']
                   :              ['🥉 Bronze','tier-bronze'];
        return `<tr>
            <td style="font-weight:600;">${c.name}</td>
            <td>${c.phone}</td>
            <td style="color:#ff5a92;font-weight:600;">${c.spent.toLocaleString('vi')}₫</td>
            <td style="color:#a855f7;font-weight:700;">${pts} ⭐</td>
            <td><span class="tier-badge ${tier[1]}">${tier[0]}</span></td>
        </tr>`;
    }).join('');
}
```

Thêm guard trong `switchTab()` để đảm bảo data đã load:
```javascript
async function switchTab(tab) {
    if (allOrders.length === 0) await loadData(); // guard: chờ data nếu chưa có
    // ... phần còn lại giữ nguyên
}
```

---

### BUG 2 — Database JSON: mất dữ liệu khi deploy, race condition (HIGH)

**Vấn đề:** File `stock.json` hiện là `[]` rỗng. Toàn bộ data đơn hàng lưu trong file JSON trên Railway — nhưng Railway dùng ephemeral filesystem, **mọi file ghi đều bị xóa khi restart/redeploy**.

**Các rủi ro:**
- Mất toàn bộ đơn hàng sau mỗi lần deploy
- Race condition: 2 request đồng thời đọc-sửa-ghi file → mất 1 đơn
- File corrupt nếu process bị kill giữa chừng khi đang ghi

**Fix đề xuất — migrate sang SQLite:**
```python
import sqlite3
import json
from contextlib import contextmanager

DB_PATH = 'data/shop.db'  # Mount Railway Persistent Volume tại /data

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging: an toàn concurrent writes
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as db:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                name TEXT,
                phone TEXT,
                address TEXT,
                items TEXT,      -- JSON string
                total REAL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                note TEXT,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE IF NOT EXISTS inventory (
                id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                stock INTEGER DEFAULT 0,
                price REAL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS inventory_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT,
                action TEXT,     -- 'in' hoặc 'out'
                qty INTEGER,
                note TEXT,
                stock_after INTEGER,
                timestamp TEXT DEFAULT (datetime('now', 'localtime'))
            );
        ''')
```

**Thêm Railway Persistent Volume:** Trong Railway dashboard → dự án → Add Volume → mount path `/data`. Sau đó set `DB_PATH = '/data/shop.db'`.

---

### BUG 3 — Admin không có authentication (HIGH)

**Vấn đề:** `admin.html` không kiểm tra đăng nhập. Bất kỳ ai biết URL đều có thể xem đơn hàng, thông tin khách hàng, đổi trạng thái đơn, export CSV.

**Fix tối thiểu — password check phía frontend:**
```javascript
// Đầu script trong admin.html
const ADMIN_TOKEN_KEY = 'admin_token';

function checkAuth() {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Mỗi API call thêm header
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem(ADMIN_TOKEN_KEY)}`
};
```

**Fix tốt hơn — backend verify token:**
```python
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')  # Set trong Railway env vars

def verify_admin(handler):
    auth = handler.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '')
    # Verify token (simple: hash(password+salt), hoặc dùng JWT)
    return token == generate_token(ADMIN_PASSWORD)
```

---

### BUG 4 — API URL hardcode trong source (MEDIUM)

**Vấn đề:** `'https://web-production-46a5.up.railway.app'` nằm thẳng trong `admin.html`.

**Fix:**
```javascript
// Thay thế URL hardcode bằng:
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : '';  // Production: dùng relative URL (same origin) hoặc đọc từ meta tag

// Hoặc inject lúc build:
// <meta name="api-url" content="__API_URL__">
const API = document.querySelector('meta[name="api-url"]')?.content || '';
```

---

### BUG 5 — lang="en" nhưng nội dung tiếng Việt (LOW)

**File:** `index.html` dòng 2  
**Fix:** Đổi `<html lang="en">` thành `<html lang="vi">`

---

## 3. Roadmap Cải Tiến Ưu Tiên

### Sprint 1 — Fix bugs critical (1-2 ngày)
- [ ] Fix `loadAnalytics()` và `loadLoyalty()` dùng `allOrders` thay `localStorage`
- [ ] Thêm `async` guard trong `switchTab()`
- [ ] Fix `lang="vi"` trong index.html
- [ ] Ẩn API URL bằng relative path hoặc env injection

### Sprint 2 — Database (2-3 ngày)
- [ ] Viết `init_db()` với SQLite schema như trên
- [ ] Migrate các endpoint: `/api/orders`, `/api/inventory`, `/api/stats`
- [ ] Thêm Railway Persistent Volume, update `DB_PATH`
- [ ] Script migrate data từ JSON cũ sang SQLite (nếu có data)

### Sprint 3 — Authentication (1-2 ngày)
- [ ] Tạo `login.html` cho admin
- [ ] Backend: endpoint `POST /api/admin/login` trả JWT
- [ ] Frontend: lưu token vào `sessionStorage`, attach vào mọi API call
- [ ] Backend: middleware verify token cho các route `/api/orders`, `/api/inventory`

### Sprint 4 — Tách code (ongoing)
- [ ] Tách `admin.html` (1079 dòng) thành modules:
  - `admin-orders.js` — tab Orders
  - `admin-stock.js` — tab Stock
  - `admin-analytics.js` — tab Analytics + Loyalty
  - `admin-charts.js` — chart rendering
- [ ] Tạo `utils.js` với `formatVND()`, `STATUS_MAP`, `API_BASE`

### Sprint 5 — Testing (nice to have)
- [ ] `pytest` cho Python backend (test các endpoint chính)
- [ ] Playwright E2E test cho order flow
- [ ] Tích hợp vào GitHub Actions

---

## 4. Cấu trúc Data Hiện Tại

### Order object (từ API)
```json
{
  "orderId": "ORD-20240315-001",
  "name": "Nguyễn Thị A",
  "phone": "0901234567",
  "address": "123 Đường ABC, Q1, HCM",
  "items": [
    { "name": "LANEIGE Lip Sleeping Mask", "qty": 2, "price": 350000 }
  ],
  "total": 700000,
  "status": "pending",
  "note": "Giao buổi sáng",
  "created_at": "2024-03-15T10:30:00"
}
```

### Status flow
`pending` → `confirmed` → `shipping` → `completed`  
`pending` / `confirmed` / `shipping` → `cancelled`

### Inventory object
```json
{
  "id": "KB001",
  "name": "LANEIGE Lip Sleeping Mask Berry",
  "category": "Skincare",
  "stock": 15,
  "price": 350000
}
```

---

## 5. API Endpoints Hiện Có

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/orders` | Lấy tất cả đơn hàng |
| PUT | `/api/orders/:id` | Cập nhật status đơn |
| GET | `/api/stats` | KPI: total, pending, shipping, revenue |
| GET | `/api/revenue-monthly` | Doanh thu 12 tháng |
| GET | `/api/inventory` | Danh sách tồn kho |
| PUT | `/api/inventory/:id` | Nhập/xuất tồn kho |
| GET | `/api/inventory/history` | Lịch sử xuất nhập |

---

## 6. Lưu Ý Khi Cải Tiến

- **Không thay đổi UI/UX**: design dark theme, gradient pink/purple là intentional, giữ nguyên
- **Giữ Vanilla JS**: không migrate sang React/Vue — không cần thiết cho scale hiện tại
- **Tương thích mobile**: app dùng nhiều trên điện thoại, test responsive trước khi commit
- **Telegram bot vẫn hoạt động**: mọi thay đổi backend cần đảm bảo bot vẫn nhận thông báo đơn mới
- **Railway free tier**: tránh thêm dependencies nặng, giữ startup time nhanh
- **Tiếng Việt**: toàn bộ text hiển thị là tiếng Việt, giữ nguyên ngôn ngữ

---

*File này được tạo tự động từ phân tích repo. Cập nhật lần cuối: 24/03/2026.*
