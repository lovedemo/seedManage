.PHONY: dev run build clean fmt test

# 开发模式（热重载）
dev:
	@echo "🔥 启动开发模式（热重载）..."
	@air

# 普通运行
run:
	@echo "🚀 启动服务..."
	@go run ./cmd/server

# 编译
build:
	@echo "📦 编译项目..."
	@go build -o bin/seedmanage ./cmd/server

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
	@rm -rf tmp/ bin/
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
	@echo "  make build         - 编译项目"
	@echo "  make fmt           - 格式化代码"
	@echo "  make test          - 运行测试"
	@echo "  make clean         - 清理临时文件"
	@echo "  make install-tools - 安装开发工具"

