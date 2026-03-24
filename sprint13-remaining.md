# MISSION: Sprint 4 + Sprint 5 — K-Beauty Order

## Context
- Project: /Users/apple/Documents/MEKONG CLI/apps/k-beauty-order
- Sprint 1–3 đã hoàn thành (bug fix, SQLite migration, admin auth)
- File `admin.html` có >1000 dòng JS inline cần tách ra

## Sprint 4 — Tách code admin.html

### Bước 1: Tạo thư mục `src/admin/`

### Bước 2: Tạo `src/admin/utils.js`
Chuyển các hàm tiện ích từ admin.html:
- `formatVND()`, `STATUS_MAP`, `API` constant, `apiFetch()`, `_token` guard

### Bước 3: Tạo `src/admin/orders.js`  
Chuyển logic tab Orders:
- `loadData()`, `renderTable()`, `sortTable()`, `updateStatus()`, `filterByStatus()`

### Bước 4: Tạo `src/admin/stock.js`
Chuyển logic tab Kho:
- `loadStock()`, `renderStockTable()`, `openStockModal()`, `submitStockUpdate()`

### Bước 5: Tạo `src/admin/analytics.js`
Chuyển logic tab Analytics + Loyalty:
- `loadAnalytics()`, `loadLoyalty()`, `renderChart()`, `toggleChart()`

### Bước 6: Cập nhật `admin.html`
- Xoá toàn bộ JS inline trong `<script>`
- Thêm `<script type="module">` import từ các file js mới
- Giữ nguyên HTML + CSS

### Lưu ý quan trọng:
- Tất cả file JS mới dùng `export` / `import` (ES Module)
- Đảm bảo trang admin vẫn hoạt động SAU khi tách
- Commit: `refactor(M65): split monolithic admin.html into separate js modules`

## Sprint 5 — Testing (Tùy chọn, chỉ làm nếu còn hạn mức)

### test backend
```bash
cd tools && python3 -c "
from db import SqliteStore
s = SqliteStore('/tmp/test.db')
s.add_order({'orderId': 'TEST-001', 'name': 'Test', 'total': 100000})
o = s.get_order_by_id('TEST-001')
assert o is not None, 'Order not found'
assert o['name'] == 'Test'
print('All tests passed')
"
```

### Commit nếu tạo test file: `test(M66): basic backend tests`
