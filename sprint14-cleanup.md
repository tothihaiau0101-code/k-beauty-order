---
description: Sprint 14 — Cleanup & Stabilize K-Beauty Order
---

## Context
- Dự án: K-Beauty Order (BeaPop)
- Thư mục: apps/k-beauty-order
- Sprint 1-4 đã hoàn thành (bug fix, SQLite, admin auth, code splitting)

## Tasks

### M67 — Xóa class DataStore cũ
1. Mở `tools/telegram_bot.py`
2. Xóa toàn bộ class `DataStore` (khoảng dòng 236-529)
3. Kiểm tra không còn reference nào đến `DataStore`
4. Chạy `python3 -c "import py_compile; py_compile.compile('tools/telegram_bot.py', doraise=True)"`
5. Commit: `refactor(M67): remove deprecated DataStore class, fully using SqliteStore`

### M68 — Thêm test step vào GitHub Actions
1. Mở `.github/workflows/deploy.yml`
2. Thêm job `test` trước job deploy: checkout → setup Python 3.11 → pip install pytest → pytest tests/ -v
3. Job deploy thêm `needs: test`
4. Commit: `ci(M68): add pytest step to github actions before deploy`

### M69 — Tạo DEPLOY.md
1. Tạo file `DEPLOY.md` mới
2. Viết hướng dẫn: mount Railway Persistent Volume path `/data`, set env DB_PATH=/data/shop.db, set ADMIN_PASSWORD
3. Hướng dẫn deploy Cloudflare Pages (frontend)
4. Commit: `docs(M69): add DEPLOY.md with Railway volume and env setup guide`

### M70 — Dọn stock.json
1. Kiểm tra telegram_bot.py và db.py không đọc trực tiếp stock.json
2. Xóa hoặc cập nhật file stock.json ở root
3. Commit: `chore(M70): cleanup legacy stock.json, data now in SQLite`
