#!/bin/bash
# Nạp cài đặt shell của User (để có PATH của node, npm, claude)
if [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc" 2>/dev/null
elif [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile" 2>/dev/null
fi

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

cd "/Users/apple/Documents/MEKONG CLI/apps/k-beauty-order"
clear
echo "==================================================="
echo "🚀 ĐANG KHỞI ĐỘNG CLAUDE CODE CLI (WORKER MISSION)"
echo "==================================================="

claude -p "Đóng vai Backend Engineer. Đọc file .claude/commands/m77-m78-auth.md và cto_dispatch_missions.md. Bắt đầu làm việc từng bước một, commit rõ ràng." --allowedTools "Edit,Write,Bash"

echo "==================================================="
echo "✅ WORKER ĐÃ HOÀN THÀNH HOẶC DỪNG LẠI"
read -p "Nhấn Enter để đóng cửa sổ này..."
