Đóng vai Engineer. Đọc file cto_dispatch_missions.md trong thư mục dự án. Tìm MISSION 55: Chương trình Voucher Thưởng theo Mốc Chi Tiêu. Thực hiện đầy đủ 5 bước trong mission:

1. auth.js — Thêm VOUCHER_KEY, REWARD_MILESTONES, và các methods voucher vào Auth object
2. account.html — Thêm CSS styles cho milestone tracker và voucher wallet
3. account.html — Thêm HTML sections (Mục Tiêu Thưởng + Voucher Của Tôi) vào renderAccount()
4. order-form.html — Tích hợp loyalty voucher vào applyVoucher() và mark used khi đặt hàng
5. order-form.html — Thêm thông báo nudge trong cart bar khi gần đạt mốc

Làm theo code snippets chi tiết trong cto_dispatch_missions.md. Commit: feat(M55): loyalty voucher program. Xong deploy lên Cloudflare Pages project k-beauty-order.
