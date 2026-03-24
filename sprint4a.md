# Sprint 4A — Worker Task

Đóng vai Engineer. Đọc file `cto_dispatch_missions.md` trong thư mục hiện tại.

## Nhiệm vụ
Thực hiện Sprint 4A gồm 5 missions:

1. **M62**: Sửa lỗi Service Worker PWA — sửa `index.html`, `sw.js` và thêm `offline.html`
2. **M63**: Trang Đăng ký Trải nghiệm (Tester) — tạo `tester.html`, sửa navbar
3. **M45**: Category filter bar (Skincare/Makeup/Album/Combo) — sửa `catalog.html` + `styles.css`
4. **M4**: Social channels floating sidebar — sửa `catalog.html`
5. **M46**: Order tracking page — tạo `tracking.html` mới

## Yêu cầu
- Đọc chi tiết kỹ thuật trong `cto_dispatch_missions.md`
- Mỗi mission commit riêng theo format: `feat(MXX): mô tả`
- Sau khi hoàn thành cả 3, deploy lên Cloudflare Pages:
  ```bash
  git push
  wrangler pages deploy . --project-name k-beauty-order --commit-dirty=true
  ```
