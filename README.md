# 本地磁力搜索卡片服务

该项目提供一个前后端分离的本地磁力搜索体验：

- **后端（Go）** 负责聚合不同磁力搜索来源，通过适配器（Adapter）模式解析并统一结果。
- **前端（静态网页）** 提供卡片式的展示界面，可在页面上自由切换不同的数据适配器。

前端与后端在同一个仓库中维护，便于本地开发和部署。

## 功能特性

- 🔍 支持关键字搜索与直接粘贴磁力链接
- 🔁 多个磁力源适配器，页面内实时切换
- 🛡️ 主适配器出错或无结果时自动回退到备用适配器
- 📄 卡片化展示：大小、做种数、Info Hash、Trackers 等关键信息一目了然
- 📋 一键复制磁力链接

## 目录结构

```
.
├── backend/               # Go 后端服务（提供 JSON API）
├── frontend/              # 静态前端页面（HTML/CSS/JS）
├── data/                  # 本地示例数据（备用适配器使用）
├── package.json           # 前端开发依赖 & 脚本
├── package-lock.json
└── README.md
```

## 后端（Go）

### 快速启动

```bash
# 在项目根目录
cd backend
GO111MODULE=on go run .
```

默认监听 `http://localhost:3001`，提供 `GET /api/search`、`GET /api/adapters`、`GET /api/health` 三个接口。

### 环境变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 后端服务监听端口 |
| `MAGNET_SEARCH_ENDPOINT` | `https://apibay.org/q.php` | The Pirate Bay（apibay）公开 API 地址 |
| `SAMPLE_DATA_FILE` | `data/sampleResults.json` | 本地示例数据路径（JSON 数组） |
| `DEFAULT_ADAPTER` | `apibay` | 默认使用的适配器 ID |
| `FALLBACK_ADAPTER` | `sample` | 备用适配器 ID（主适配器失败或无结果时触发） |

> 适配器采用接口化设计，你可以在 `backend/main.go` 中扩展更多来源，只需实现 `Search(ctx, term)` 方法并注册进 `AdapterRegistry` 即可。

## 前端（静态网页）

### 安装与启动

```bash
npm install
npm start
```

脚本会使用 [`serve`](https://github.com/vercel/serve) 将 `frontend/` 目录以静态网站形式托管，默认端口为 `http://localhost:5173`。

首次加载时前端会自动调用后端的 `/api/adapters` 接口同步适配器列表。若后端运行在其它地址，可在浏览器控制台执行以下命令后刷新页面：

```js
localStorage.setItem('magnetApiBase', 'http://your-backend-host:3001');
```

## 适配器一览

| 适配器 ID | 名称 | 描述 |
| --- | --- | --- |
| `apibay` | The Pirate Bay (apibay.org) | 通过公开 API 获取实时磁力资源数据 |
| `sample` | 本地示例数据 | 读取 `data/sampleResults.json` 提供的内置演示数据 |

> 页面左下角会显示当前适配器的简介和来源，切换选项后立即生效。

## API 简述

- `GET /api/adapters`：返回已注册的适配器、默认适配器 ID
- `GET /api/search?q=<keyword>&adapter=<id>`：执行搜索。若 `q` 为 `magnet:?` 前缀的磁力链接，则直接解析并返回磁力卡片
- `GET /api/health`：健康检查，包含当前启用的适配器列表

所有接口均返回 UTF-8 编码的 JSON 数据，并允许跨域访问，方便单独部署前后端。

## 扩展提示

- 新增适配器时，建议在后台统一转换为 `SearchResult` 结构，保持前端无感知
- `data/sampleResults.json` 仅作为演示，可替换成本地合法数据
- 如果需要持久化后端服务，可将 `go run .` 替换为 `go build` 后执行生成的二进制

祝你使用愉快！
