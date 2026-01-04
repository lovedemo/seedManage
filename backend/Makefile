.PHONY: dev run build clean fmt test build-all build-windows build-linux build-macos

# 开发模式（热重载）
dev:
	@echo "🔥 启动开发模式（热重载）..."
	@air

# 普通运行
run:
	@echo "🚀 启动服务..."
	@go run ./cmd/server

# 编译当前平台
build:
	@echo "📦 编译项目..."
	@mkdir -p bin
	@echo "  [1/2] 复制前端文件..."
	@rm -rf cmd/server/frontend
	@cp -r ../frontend cmd/server/
	@echo "  [2/2] 编译二进制文件..."
	@go build -ldflags="-s -w" -o bin/seedmanage ./cmd/server
	@echo "✅ 编译完成: bin/seedmanage"

# 编译所有平台
build-all: build-windows build-linux build-macos
	@echo "✅ 所有平台编译完成！"

# 编译 Windows
build-windows:
	@echo "📦 编译 Windows 版本..."
	@mkdir -p bin
	@echo "  [1/2] 复制前端文件..."
	@rm -rf cmd/server/frontend
	@cp -r ../frontend cmd/server/
	@echo "  [2/2] 编译二进制文件..."
	@GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/seedmanage-windows-amd64.exe ./cmd/server
	@echo "✅ Windows 版本: bin/seedmanage-windows-amd64.exe"

# 编译 Linux
build-linux:
	@echo "📦 编译 Linux 版本..."
	@mkdir -p bin
	@echo "  [1/2] 复制前端文件..."
	@rm -rf cmd/server/frontend
	@cp -r ../frontend cmd/server/
	@echo "  [2/2] 编译二进制文件..."
	@GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/seedmanage-linux-amd64 ./cmd/server
	@echo "✅ Linux 版本: bin/seedmanage-linux-amd64"

# 编译 macOS
build-macos:
	@echo "📦 编译 macOS 版本..."
	@mkdir -p bin
	@echo "  [1/3] 复制前端文件..."
	@rm -rf cmd/server/frontend
	@cp -r ../frontend cmd/server/
	@echo "  [2/3] 编译 amd64 版本..."
	@GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o bin/seedmanage-darwin-amd64 ./cmd/server
	@echo "  [3/3] 编译 arm64 版本..."
	@GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o bin/seedmanage-darwin-arm64 ./cmd/server
	@echo "✅ macOS 版本: bin/seedmanage-darwin-amd64, bin/seedmanage-darwin-arm64"

# 格式化代码
fmt:
	@echo "✨ 格式化代码..."
	@gofmt -w .
	@goimports -w .

# 运行测试
test:
	@echo "🧪 运行测试..."
	@go test -v ./...

# 清理
clean:
	@echo "🧹 清理临时文件..."
	@rm -rf tmp/ bin/ cmd/server/frontend
	@go clean

# 安装依赖工具
install-tools:
	@echo "🔧 安装开发工具..."
	@go install github.com/air-verse/air@latest
	@go install golang.org/x/tools/cmd/goimports@latest

# 帮助信息
help:
	@echo "可用命令："
	@echo "  make dev           - 启动开发模式（热重载）"
	@echo "  make run           - 普通运行"
	@echo "  make build         - 编译当前平台"
	@echo "  make build-all     - 编译所有平台"
	@echo "  make build-windows - 编译 Windows 版本"
	@echo "  make build-linux   - 编译 Linux 版本"
	@echo "  make build-macos   - 编译 macOS 版本"
	@echo "  make fmt           - 格式化代码"
	@echo "  make test          - 运行测试"
	@echo "  make clean         - 清理临时文件"
	@echo "  make install-tools - 安装开发工具"

