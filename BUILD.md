# 构建和打包指南

本文档介绍如何将项目打包成可执行文件，方便分发和部署。

## 快速开始

### Windows 用户

1. 双击运行 `build-windows.bat`
2. 等待编译完成
3. 在 `release` 目录中找到生成的可执行文件

### Linux/macOS 用户

```bash
chmod +x build.sh
./build.sh
```

生成的文件将位于 `release` 目录中。

## 编译方式

### 方式一：使用 Makefile（推荐）

```bash
cd backend

# 编译当前平台
make build

# 编译 Windows 版本
make build-windows

# 编译 Linux 版本
make build-linux

# 编译 macOS 版本
make build-macos

# 编译所有平台
make build-all
```

### 方式二：使用提供的脚本

**Windows:**
```bash
build-windows.bat
```

**Linux/macOS:**
```bash
./build.sh
```

### 方式三：手动编译

```bash
cd backend

# Windows amd64
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o seedmanage.exe ./cmd/server

# Linux amd64
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o seedmanage ./cmd/server

# macOS amd64
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o seedmanage ./cmd/server

# macOS arm64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o seedmanage ./cmd/server
```

## 运行打包后的程序

### 准备文件

1. 将可执行文件复制到目标目录
2. 创建 `data` 文件夹
3. 将 `data/sampleResults.json` 复制到 `data` 文件夹中

目录结构示例：

```
magnet-search/
├── seedmanage.exe            # 或 seedmanage (Linux/macOS)
└── data/
    ├── sampleResults.json     # 示例数据（必需）
    └── searchHistory.json    # 搜索历史（自动生成）
```

### 运行程序

**Windows:**
```bash
# 直接双击运行，或在命令行执行
seedmanage.exe

# 或指定端口
set PORT=8080
seedmanage.exe
```

**Linux:**
```bash
# 添加执行权限
chmod +x seedmanage

# 运行
./seedmanage

# 或指定端口
PORT=8080 ./seedmanage
```

**macOS:**
```bash
# 添加执行权限
chmod +x seedmanage

# 运行
./seedmanage

# 或指定端口
PORT=8080 ./seedmanage
```

### 访问服务

在浏览器中打开：`http://localhost:3001`

如果修改了端口，访问：`http://localhost:PORT`（例如 http://localhost:8080）

## 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 服务监听端口 |
| `SAMPLE_DATA_FILE` | `data/sampleResults.json` | 示例数据路径 |
| `SEARCH_HISTORY_FILE` | `data/searchHistory.json` | 搜索历史文件路径 |
| `DEFAULT_ADAPTER` | `apibay` | 默认适配器 |
| `FALLBACK_ADAPTER` | `sample` | 备用适配器 |
| `MAGNET_SEARCH_ENDPOINT` | `https://apibay.org/q.php` | APIBay API 地址 |
| `NYAA_ENDPOINT` | `https://nyaaapi.onrender.com/nyaa` | Nyaa API 地址 |
| `SUKEBEI_ENDPOINT` | `https://nyaaapi.onrender.com/sukebei` | Sukebei API 地址 |

### 配置示例

**Windows (CMD):**
```cmd
set PORT=8080
set DEFAULT_ADAPTER=nyaa
seedmanage.exe
```

**Windows (PowerShell):**
```powershell
$env:PORT="8080"
$env:DEFAULT_ADAPTER="nyaa"
.\seedmanage.exe
```

**Linux/macOS:**
```bash
PORT=8080 DEFAULT_ADAPTER=nyaa ./seedmanage
```

## 技术细节

### 前端嵌入

项目使用 Go 的 `embed` 包将前端静态文件嵌入到二进制中，实现：

- ✅ 单文件部署，无需额外配置
- ✅ 前后端一体化，运行更简单
- ✅ 无需额外的 Web 服务器

### 编译优化

编译时使用 `-ldflags="-s -w"` 参数：

- `-s`: 省略符号表
- `-w`: 省略 DWARF 符号表

这可以显著减小二进制文件的大小（通常减少 30-50%）。

### 生成的文件

- **Windows:** `seedmanage-windows-amd64.exe` (约 8-10 MB)
- **Linux:** `seedmanage-linux-amd64` (约 8-10 MB)
- **macOS:** `seedmanage-darwin-amd64` / `seedmanage-darwin-arm64` (约 8-10 MB)

## 故障排除

### 无法启动

1. 确保可执行文件有执行权限（Linux/macOS）
2. 检查 `data` 文件夹是否存在
3. 检查 `data/sampleResults.json` 是否存在
4. 查看端口是否被占用：`netstat -ano | findstr :3001` (Windows) 或 `lsof -i :3001` (Linux/macOS)

### 端口冲突

修改端口后重新运行：

```bash
# Windows
set PORT=8080
seedmanage.exe

# Linux/macOS
PORT=8080 ./seedmanage
```

### 前端无法加载

确保：
- 可执行文件未被损坏
- 使用的是从源码编译的版本（不是部分文件）

### 适配器不可用

- 检查网络连接
- 确认 API 端点地址正确
- 尝试修改默认适配器或备用适配器

## 分发建议

### Windows 分发

1. 使用 Inno Setup 或 NSIS 创建安装程序
2. 或直接压缩 `.exe` 和 `data` 文件夹
3. 提供使用说明文档

### Linux 分发

1. 创建 `.deb` 或 `.rpm` 包
2. 或使用 AppImage 格式
3. 提供 systemd 服务文件（可选）

### macOS 分发

1. 创建 `.app` 应用程序包
2. 代码签名（如果需要）
3. 公证（如需分发给他人）

## 注意事项

1. **数据文件**: `data/sampleResults.json` 是必需的，程序启动时会读取它
2. **搜索历史**: 首次运行后会在 `data` 目录创建 `searchHistory.json`
3. **网络访问**: 程序需要网络连接才能使用在线适配器（apibay、nyaa 等）
4. **防火墙**: 如果设置了防火墙，需要允许程序访问网络
5. **杀毒软件**: 某些杀毒软件可能误报，可以添加信任

## 高级用法

### 作为系统服务运行

**Windows (使用 NSSM):**
```cmd
nssm install magnet-search "C:\path\to\seedmanage.exe"
nssm start magnet-search
```

**Linux (使用 systemd):**
```bash
# 创建服务文件
sudo nano /etc/systemd/system/magnet-search.service
```

```
[Unit]
Description=Magnet Search Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/magnet-search
ExecStart=/path/to/magnet-search/seedmanage
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable magnet-search
sudo systemctl start magnet-search
```

**macOS (使用 launchd):**
```bash
# 创建 plist 文件
~/Library/LaunchAgents/com.magnet.search.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.magnet.search</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/seedmanage</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

```bash
# 加载服务
launchctl load ~/Library/LaunchAgents/com.magnet.search.plist
```

## 帮助

如有问题，请参考：

- 项目 README.md
- 问题反馈：创建 GitHub Issue
