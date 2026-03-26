#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "/Users/apple/Documents/MEKONG CLI/apps/k-beauty-order"
clear
echo "==================================================="
echo "🔄 TỰ ĐỘNG XỬ LÝ LỖI AUTH (LOGIN) VÀ GIAO VIỆC"
echo "==================================================="
echo "Đang dọn dẹp biến môi trường gây lỗi 401 (như LLM_BASE_URL)..."
unset LLM_BASE_URL
unset LLM_API_KEY
echo "Đang kích hoạt quy trình Login (nếu cần)..."
npx @anthropic-ai/claude-code login

echo "==================================================="
echo "🚀 ĐANG KÍCH HOẠT CTO (CLAUDE CODE CLI) ĐỂ CHẠY TASK"
echo "==================================================="
npx @anthropic-ai/claude-code -p 'Chạy lệnh: mekong cook "Đọc file cto_dispatch_missions.md và thực hiện MISSION 77 (Khách hàng JWT Auth) cùng MISSION 78 (Admin JWT Auth). Update schema.sql, tạo bảng D1 admins, viết Worker API bảo mật JWT, cập nhật frontend. Tự động commit và deploy nhé."' --allowedTools "Edit,Write,Bash"

echo "==================================================="
echo "✅ HOÀN TẤT TASK. CTO ĐÃ RỜI ĐI."
read -p "Nhấn Enter để đóng..."
