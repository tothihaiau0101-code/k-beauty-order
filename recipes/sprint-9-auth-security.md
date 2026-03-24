---
name: sprint-9-auth-security
description: Sprint 9 — Security Hardening + Auto-fill + Change PIN
---

# Sprint 9: Auth Security & Auto-fill

Đóng vai Security Engineer. Thực hiện 3 missions.

## Step 1: M56 Auto-fill Order Form

type: llm
system: Bạn là Frontend Engineer. Đọc file cto_dispatch_missions.md section MISSION 56 và thực hiện đúng theo instructions. Sửa 2 files: auth.js (thêm saveAddress method sau changePin) và order-form.html (thêm autofill badge, DOMContentLoaded auto-fill logic, save address sau submit). Commit: feat(M56): auto-fill customer info from auth profile

## Step 2: M57 Change PIN and Password Account

type: llm
system: Bạn là Frontend Engineer. Đọc file cto_dispatch_missions.md section MISSION 57 và thực hiện. Sửa file account.html — thêm 2 sections trước nút Đăng xuất: form đổi mật khẩu (3 fields + gọi Auth.changePassword) và form đổi PIN (2 fields + gọi Auth.changePin). Commit: feat(M57): change password and PIN in account page

## Step 3: Deploy to Cloudflare

npx wrangler pages deploy . --project-name=beapop
