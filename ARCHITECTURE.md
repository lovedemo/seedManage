# 项目架构文档

## 🏗️ 项目结构总览

```
seedManage/
├── backend/                    # Go 后端服务
│   ├── cmd/
│   │   └── server/
│   │       └── main.go        # 📍 应用程序入口
│   ├── internal/              # 私有包（不可被外部导入）
│   │   ├── config/
│   │   │   └── config.go      # ⚙️ 配置和常量
│   │   ├── models/
│   │   │   └── models.go      # 📦 数据模型和接口定义
│   │   ├── service/
│   │   │   ├── service.go     # 🌐 HTTP API 服务
│   │   │   └── errors.go      # ❌ 错误类型
│   │   ├── registry/
│   │   │   └── registry.go    # 📋 适配器注册管理
│   │   ├── adapters/
│   │   │   ├── apibay.go      # 🔌 APIBay 适配器
│   │   │   ├── nyaa.go        # 🔌 Nyaa 适配器
│   │   │   └── sample.go      # 🔌 本地示例适配器
│   │   └── utils/
│   │       ├── magnet.go      # 🧲 磁力链接工具
│   │       └── helpers.go     # 🛠️ 通用工具函数
│   ├── go.mod                 # Go 模块定义
│   ├── Makefile               # 开发命令
│   ├── .air.toml              # 热重载配置
│   ├── .gitignore             # Git 忽略文件
│   └── README.md              # 后端文档
├── frontend/                   # 静态前端页面
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/                       # 本地示例数据
│   └── sampleResults.json
├── .vscode/
│   └── settings.json          # VS Code/Cursor 配置
├── start-dev.sh               # 快速启动脚本
├── package.json
└── README.md                  # 项目总文档
```

## 📐 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│         HTTP Client (前端/其他)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│     Service Layer (service/)            │
│   - 路由处理                             │
│   - 请求验证                             │
│   - 响应封装                             │
│   - CORS 支持                           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Registry Layer (registry/)            │
│   - 适配器注册                           │
│   - 默认/备用适配器管理                  │
│   - 线程安全访问                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Adapter Layer (adapters/)             │
│   ┌─────────┐  ┌──────┐  ┌─────────┐  │
│   │ APIBay  │  │ Nyaa │  │ Sample  │  │
│   └─────────┘  └──────┘  └─────────┘  │
│   - 搜索实现                             │
│   - 数据转换                             │
│   - 错误处理                             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   External APIs / Local Data            │
│   - apibay.org                          │
│   - nyaaapi.onrender.com                │
│   - 本地 JSON 文件                       │
│   - 其他数据源...                        │
└─────────────────────────────────────────┘
```

## 🔄 数据流

### 搜索请求流程

```
1. 前端发起搜索
   ↓
2. Service 接收 HTTP 请求 (/api/search?q=xxx)
   ↓
3. Service 验证参数并选择适配器
   ↓
4. Registry 返回对应的适配器实例
   ↓
5. Adapter 执行具体的搜索逻辑
   ↓
6. Adapter 返回标准化的 SearchResult 数组
   ↓
7. Service 封装成 SearchResponse（包含元数据）
   ↓
8. 返回 JSON 响应给前端
```

### 备用适配器机制

```
主适配器搜索
   ↓
失败或无结果？
   ├─ 否 → 返回结果
   └─ 是 → 尝试备用适配器
          ↓
       备用适配器搜索
          ↓
       返回结果（标记使用了备用）
```

## 🔌 适配器模式

### 接口定义

```go
type Adapter interface {
    ID() string          // 唯一标识符
    Name() string        // 显示名称
    Description() string // 描述
    Endpoint() string    // 端点地址
    Search(ctx context.Context, term string) ([]SearchResult, error)
}
```

### 实现新适配器

1. **创建文件** `internal/adapters/newadapter.go`
2. **实现接口** 所有 5 个方法
3. **注册适配器** 在 `cmd/server/main.go` 中注册
4. **配置使用** 通过环境变量选择

### 现有适配器

| 适配器 | 说明 | 数据源 |
|--------|------|--------|
| `apibay` | The Pirate Bay | apibay.org API |
| `nyaa` | Nyaa | nyaaapi.onrender.com API |
| `sample` | 本地示例 | JSON 文件 |

## 📦 模块职责

### cmd/server
- ✅ 程序入口
- ✅ 环境变量读取
- ✅ 依赖注入和初始化
- ✅ HTTP 服务器配置

### internal/config
- ✅ 环境变量常量
- ✅ 默认配置值
- ✅ 全局常量（如 trackers）

### internal/models
- ✅ 核心数据结构
- ✅ 接口定义
- ✅ API 响应格式

### internal/service
- ✅ HTTP 路由
- ✅ 请求处理
- ✅ JSON 序列化
- ✅ 错误处理
- ✅ CORS 中间件

### internal/registry
- ✅ 适配器生命周期管理
- ✅ 默认/备用适配器配置
- ✅ 线程安全的适配器访问
- ✅ 适配器列表查询

### internal/adapters
- ✅ 具体搜索实现
- ✅ 外部 API 调用
- ✅ 数据格式转换
- ✅ 错误处理

### internal/utils
- ✅ 磁力链接解析/构建
- ✅ 数据格式化
- ✅ 通用辅助函数

## 🎯 设计原则

### 1. 单一职责原则 (SRP)
- 每个包只负责一个功能领域
- 文件按功能而非类型组织

### 2. 依赖倒置原则 (DIP)
- 高层模块（service）依赖接口（Adapter）
- 低层模块（adapters）实现接口

### 3. 开闭原则 (OCP)
- 添加新适配器无需修改现有代码
- 只需实现接口并注册

### 4. 接口隔离原则 (ISP)
- Adapter 接口简洁明确
- 只包含必要的方法

### 5. 里氏替换原则 (LSP)
- 所有适配器可互相替换
- 行为一致，输出格式统一

## 🔒 封装性

### internal/ 目录
- Go 1.4+ 特性
- 只能被同一模块内的代码导入
- 防止外部直接依赖内部实现

### 导入规则
```go
// ✅ 允许
import "github.com/seedmanage/backend/internal/models"

// ❌ 不允许（从其他模块）
import "github.com/othermodule/backend/internal/models"
```

## 🚀 扩展性

### 添加新的搜索源

1. 创建适配器文件
2. 实现 5 个接口方法
3. 在 main.go 注册
4. 通过环境变量配置

### 添加新的 API 端点

1. 在 `service.go` 的 `Routes()` 添加路由
2. 实现处理函数
3. 返回标准 JSON 响应

### 添加新的工具函数

1. 确定功能领域
2. 放入对应的 utils 子包
3. 导出必要的函数

## 📝 命名规范

### 包名
- 小写字母
- 简短有意义
- 与目录名一致

### 文件名
- 小写字母 + 下划线
- 描述功能而非类型
- 如：`apibay.go` 而非 `adapter.go`

### 类型名
- 大写开头导出
- 驼峰命名
- 如：`SearchResult`, `APIService`

### 函数名
- 大写开头导出，小写开头私有
- 动词开头
- 如：`NewAdapter()`, `Search()`

## 🔧 开发工作流

```bash
# 1. 启动开发模式（热重载）
make dev

# 2. 修改代码 → 自动重启

# 3. 格式化代码（保存时自动）
make fmt

# 4. 运行测试
make test

# 5. 编译发布版本
make build
```

## 📊 性能考虑

### 并发安全
- Registry 使用读写锁
- 支持并发搜索请求

### HTTP 超时
- 读取超时：10 秒
- 写入超时：10 秒
- 空闲超时：120 秒
- 适配器请求：8 秒

### 内存优化
- 使用指针减少复制
- 预分配切片容量
- 及时关闭 HTTP 响应体

## 🔍 测试策略

### 单元测试
- 每个包独立测试
- 模拟外部依赖
- 覆盖边界情况

### 集成测试
- 测试完整请求流程
- 验证适配器协同工作
- 检查错误处理

### 建议的测试文件
```
internal/
├── models/
│   └── models_test.go
├── service/
│   └── service_test.go
├── adapters/
│   ├── apibay_test.go
│   └── sample_test.go
└── utils/
    ├── magnet_test.go
    └── helpers_test.go
```

## 🎓 最佳实践

1. ✅ 使用 context 传递请求上下文
2. ✅ 错误包含足够的上下文信息
3. ✅ 公开的 API 使用大写字母开头
4. ✅ 内部使用小写字母开头
5. ✅ 适当使用注释说明
6. ✅ 保持函数简短易读
7. ✅ 避免过度抽象

---

**最后更新**: 2025-11-20

