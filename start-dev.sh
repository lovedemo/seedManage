#!/bin/bash

# 磁力搜索服务 - 开发模式启动脚本

echo "🚀 启动磁力搜索服务（开发模式）"
echo ""

# 检查 air 是否已安装
if ! command -v air &> /dev/null; then
    echo "⚠️  未检测到 air 工具，正在安装..."
    go install github.com/air-verse/air@latest
    echo "✅ air 安装完成"
    echo ""
fi

# 检查 goimports 是否已安装
if ! command -v goimports &> /dev/null; then
    echo "⚠️  未检测到 goimports 工具，正在安装..."
    go install golang.org/x/tools/cmd/goimports@latest
    echo "✅ goimports 安装完成"
    echo ""
fi

echo "📦 启动后端服务（热重载模式）..."
echo "💡 提示：修改代码并保存后会自动重启服务"
echo "🛑 按 Ctrl+C 停止服务"
echo ""

cd backend
exec air

