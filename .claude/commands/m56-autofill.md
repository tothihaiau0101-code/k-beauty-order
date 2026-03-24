Đóng vai Frontend Engineer. Đọc file cto_dispatch_missions.md trong thư mục dự án. Tìm MISSION 56: Auto-fill Thông Tin Khách Hàng (Order Form). Thực hiện đầy đủ 4 bước:

1. auth.js — Thêm method saveAddress(address) sau changePin() (nếu chưa có)
2. order-form.html — Thêm div autofillBadge trước <!-- Customer Info --> (hidden by default, green badge "✅ Thông tin đã được điền sẵn từ tài khoản")
3. order-form.html — Thêm DOMContentLoaded listener đầu <script> trước PRODUCT DATA: check BeaPop.Auth.isLoggedIn(), fill name/phone/address từ user profile, show badge
4. order-form.html — Sau khi submit đơn thành công (trước Clear Cart), gọi BeaPop.Auth.saveAddress(data.address) để lưu địa chỉ cho lần sau

Làm theo code snippets chi tiết trong cto_dispatch_missions.md. Commit: feat(M56): auto-fill customer info from auth profile
