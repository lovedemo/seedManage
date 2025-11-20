# 磁力搜索后端服务

基于 Go 实现的磁力搜索 API 服务，采用适配器模式支持多种搜索源。

## 📁 项目结构

```
backend/
├── cmd/
│   └── server/           # 应用程序入口
│       └── main.go
├── internal/             # 私有代码（不可被外部导入）
│   ├── config/           # 配置管理
│   │   └── config.go
│   ├── models/           # 数据模型和接口
│   │   └── models.go
│   ├── service/          # HTTP 服务层
│   │   ├── service.go
│   │   └── errors.go
│   ├── registry/         # 适配器注册器
│   │   └── registry.go
│   ├── adapters/         # 搜索源适配器
│   │   ├── apibay.go
│   │   └── sample.go
│   └── utils/            # 工具函数
│       ├── magnet.go
│       └── helpers.go
├── go.mod                # Go 模块定义
├── Makefile              # 开发命令
└── .air.toml             # 热重载配置
```

## 🚀 快速开始

### 开发模式（推荐）

```bash
cd backend
make dev
```

代码修改后会自动重新编译和重启服务。

### 普通运行

```bash
make run
```

### 编译二进制

```bash
make build
# 生成的二进制文件在 bin/seedmanage
```

## 📦 模块说明

### cmd/server

程序入口点，负责：
- 读取环境变量配置
- 初始化适配器
- 启动 HTTP 服务器

### internal/config

全局配置管理，包括：
- 环境变量常量定义
- 默认的 tracker 列表

### internal/models

核心数据模型定义：
- `SearchResult` - 搜索结果
- `SearchMeta` - 搜索元数据
- `SearchResponse` - API 响应
- `Adapter` - 适配器接口
- `AdapterInfo` - 适配器信息

### internal/service

HTTP API 服务层，提供：
- `/api/health` - 健康检查
- `/api/adapters` - 适配器列表
- `/api/search` - 搜索接口
- CORS 支持
- JSON 错误处理

### internal/registry

适配器注册管理器：
- 注册多个搜索源适配器
- 配置默认和备用适配器
- 线程安全的适配器访问

### internal/adapters

各种搜索源的适配器实现：

#### apibay.go
通过 apibay.org API 搜索 The Pirate Bay 资源

#### sample.go
本地示例数据适配器，用于测试和演示

### internal/utils

工具函数包：
- `magnet.go` - 磁力链接解析和构建
- `helpers.go` - 格式化、指针辅助等通用函数

## 🔧 开发指南

### 添加新的适配器

1. 在 `internal/adapters/` 创建新文件，如 `newadapter.go`

2. 实现 `models.Adapter` 接口：

```go
package adapters

import (
    "context"
    "github.com/seedmanage/backend/internal/models"
)

type NewAdapter struct {
    // 你的字段
}

func NewNewAdapter() models.Adapter {
    return &NewAdapter{}
}

func (a *NewAdapter) ID() string { return "newadapter" }
func (a *NewAdapter) Name() string { return "新适配器" }
func (a *NewAdapter) Description() string { return "描述" }
func (a *NewAdapter) Endpoint() string { return "endpoint" }

func (a *NewAdapter) Search(ctx context.Context, term string) ([]models.SearchResult, error) {
    // 实现搜索逻辑
    return nil, nil
}
```

3. 在 `cmd/server/main.go` 中注册：

```go
reg.Register(adapters.NewNewAdapter())
```

### 代码规范

- 保存时自动格式化（VS Code/Cursor 配置）
- 使用 `make fmt` 手动格式化
- 遵循 Go 命名规范
- 添加必要的注释

## 📝 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3001` | 服务监听端口 |
| `MAGNET_SEARCH_ENDPOINT` | `https://apibay.org/q.php` | APIBay 端点 |
| `SAMPLE_DATA_FILE` | `data/sampleResults.json` | 示例数据路径 |
| `DEFAULT_ADAPTER` | `apibay` | 默认适配器 ID |
| `FALLBACK_ADAPTER` | `sample` | 备用适配器 ID |

## 🧪 测试

```bash
make test
```

## 🧹 清理

```bash
make clean
```

清理临时文件和编译产物。

