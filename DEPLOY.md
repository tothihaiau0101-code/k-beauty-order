# Deploy Guide - Railway Volume Setup

Hướng dẫn deploy ứng dụng K-Beauty Order lên Railway với persistent storage.

## 1. Kết nối Railway

1. Truy cập [Railway](https://railway.app)
2. Connect GitHub repository
3. Chọn repo `k-beauty-order`

## 2. Cấu hình Volume (Persistent Storage)

### Tạo Volume

```bash
# Trong Railway Dashboard -> Settings -> Volumes
# Hoặc dùng Railway CLI:
railway volume add --name data --mount-path /app/data
```

### Mount Path

- **Mount path:** `/app/data`
- **Volume name:** `data`

Volume này sẽ lưu trữ:
- `data/orders.json` - Đơn hàng
- `data/stock.json` - Tồn kho
- `data/customers.json` - Khách hàng
- `data/chats.json` - Chat sessions
- `data/inventory_history.json` - Lịch sử tồn kho

## 3. Environment Variables

Thêm các biến môi trường trong Railway Dashboard -> Variables:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# PayOS
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# GHN (Giao Hang Nhanh)
GHN_TOKEN=your_token
GHN_SHOP_ID=your_shop_id

# Database (SQLite)
DATABASE_URL=/app/data/kbeauty.db
```

## 4. Deploy

### Tự động (GitHub Push)

```bash
git push origin main
```

Railway tự động deploy khi có push vào main branch.

### Thủ công

```bash
railway up
```

## 5. Verify

Kiểm tra logs:
```bash
railway logs
```

Kiểm tra health endpoint (nếu có):
```bash
curl https://your-app.railway.app/health
```

## 6. Troubleshooting

### Lỗi: Không ghi được dữ liệu

- Kiểm tra volume đã mount đúng path `/app/data` chưa
- Verify permissions: `ls -la /app/data`

### Lỗi: Mất dữ liệu sau restart

- Đảm bảo tất cả file data đều lưu trong `/app/data`
- Không lưu data trong thư mục ứng dụng

### Lỗi: Database locked

- SQLite chỉ hỗ trợ single-writer
- Xem xét chuyển sang PostgreSQL nếu cần concurrent writes

## 7. Backup

```bash
# Download data volume
railway volume download data

# Hoặc SSH vào instance và copy file
railway run bash
cp -r /app/data /tmp/backup
```
