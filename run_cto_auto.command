#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "/Users/apple/Documents/MEKONG CLI/apps/k-beauty-order"
clear
echo "==================================================="
echo "🚀 ĐANG KÍCH HOẠT CTO (CLAUDE CODE CLI)"
echo "==================================================="

# Gỡ bỏ toàn bộ các biến cấu hình từ hệ thống để Claude Code dùng mặc định Auth chính hãng:
unset ANTHROPIC_API_KEY
unset OPENAI_API_KEY
unset LLM_API_KEY
unset LLM_BASE_URL
unset CLAUDE_BACKEND

npx @anthropic-ai/claude-code -p 'Chạy lệnh: mekong cook "Thực hiện MISSION 77 (Khách hàng JWT Auth) cùng MISSION 78 (Admin JWT Auth) theo cto_dispatch_missions.md. Update schema.sql, tạo bản D1 admins, Worker API (login/register) bảo mật JWT, và cập nhật frontend. Tự động commit và deploy nhé."' --allowedTools "Edit,Write,Bash"

echo "==================================================="
echo "✅ HOÀN TẤT TASK. CTO ĐÃ RỜI ĐI."
read -p "Nhấn Enter để đóng..."
