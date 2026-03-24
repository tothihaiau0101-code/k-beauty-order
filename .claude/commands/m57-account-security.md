Đóng vai Frontend Engineer. Đọc file cto_dispatch_missions.md trong thư mục dự án. Tìm MISSION 57: Đổi PIN & Mật Khẩu trong Account Page. Thực hiện:

1. account.html — Thêm section "Đổi mật khẩu" trước nút Đăng xuất: form có 3 fields (mật khẩu cũ, mới, xác nhận) + nút submit + result display. Gọi window.BeaPop.Auth.changePassword(oldPwd, newPwd).
2. account.html — Thêm section "Đổi PIN bảo mật" sau section đổi mật khẩu: form có 2 fields (mật khẩu hiện tại, PIN mới) + nút submit + result display. Gọi window.BeaPop.Auth.changePin(pwd, newPin).

Cả 2 section hiển thị result (success/error) inline. Style consistent với page hiện tại.

Commit: feat(M57): change password and PIN in account page. Xong deploy: npx wrangler pages deploy . --project-name=beapop
