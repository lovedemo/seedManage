#!/bin/bash
set -e

echo "===================================="
echo "  本地磁力搜索服务 - 跨平台构建脚本"
echo "===================================="
echo ""

cd backend

echo "[1/3] 准备构建目录..."
mkdir -p bin

echo "[2/3] 编译可执行文件..."

# Linux amd64
echo "  - 编译 Linux amd64..."
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/seedmanage-linux-amd64 ./cmd/server

# macOS amd64
echo "  - 编译 macOS amd64..."
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o bin/seedmanage-darwin-amd64 ./cmd/server

# macOS arm64 (Apple Silicon)
echo "  - 编译 macOS arm64..."
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o bin/seedmanage-darwin-arm64 ./cmd/server

# Windows amd64
echo "  - 编译 Windows amd64..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/seedmanage-windows-amd64.exe ./cmd/server

echo ""
echo "[3/3] 创建发布包..."
cd ..

mkdir -p release
cp backend/bin/* release/
cp -r data release/

echo ""
echo "===================================="
echo "✅ 构建成功！"
echo "===================================="
echo ""
echo "生成的文件："
echo "  - release/seedmanage-linux-amd64"
echo "  - release/seedmanage-darwin-amd64"
echo "  - release/seedmanage-darwin-arm64"
echo "  - release/seedmanage-windows-amd64.exe"
echo "  - release/data/"
echo ""
echo "使用方法："
echo "  1. 将对应平台的可执行文件复制到目标机器"
echo "  2. 在可执行文件同目录下创建 data 文件夹并放入 sampleResults.json"
echo "  3. 运行可执行文件"
echo "  4. 在浏览器中打开 http://localhost:3001"
echo "  5. 如需修改端口，设置环境变量：PORT=端口号"
echo ""
