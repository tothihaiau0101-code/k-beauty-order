#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "/Users/apple/Documents/MEKONG CLI/apps/k-beauty-order"
clear
echo "==================================================="
echo "🚀 ĐANG KHỞI ĐỘNG CHUẨN CLAUDE CODE CLI (ANTHROPIC)"
echo "==================================================="

# Call the official anthropic Claude Code CLI
npx @anthropic-ai/claude-code -p "Đóng vai Backend Engineer. Đọc file .claude/commands/m77-m78-auth.md và cto_dispatch_missions.md. Bắt đầu làm việc từng bước một, commit rõ ràng." --allowedTools "Edit,Write,Bash"

echo "==================================================="
echo "✅ WORKER ĐÃ HOÀN THÀNH HOẶC DỪNG LẠI"
read -p "Nhấn Enter để đóng cửa sổ này..."
