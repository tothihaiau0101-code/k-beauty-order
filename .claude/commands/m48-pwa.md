Đóng vai Engineer. Đọc file cto_dispatch_missions.md trong thư mục dự án. Tìm MISSION 48: PWA / Installable. Thực hiện cài đặt PWA App:

1. Tạo file manifest.json với thông tin cơ bản: name, theme_color (#f8f8f8), background_color (#ffffff), display standalone. (Dùng emoji dự phòng làm icons).
2. Tạo file sw.js (Service Worker) để cache các asset tĩnh cơ bản (catalog.html, styles.css).
3. Gắn thẻ link rel="manifest" href="manifest.json" vào <head> của TẤT CẢ các file HTML trong dự án.
4. Viết đoạn script đăng ký Service Worker ở đuôi script của thẻ <head> hoặc trước </body> trên mọi trang.

Làm theo chuẩn PWA.
Commit: feat(M48): PWA manifest and service worker. Xong hãy xác nhận hoàn thành.
