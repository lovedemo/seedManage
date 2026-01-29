# Docker 部署指南

本项目支持Docker容器化部署，可以在各种平台上运行，包括Render等免费托管服务。

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

1. **修改配置**：
   ```bash
   # 编辑 docker-compose.yml
   # 取消注释并修改密码
   environment:
     PASSWORD: "你的密码"
   ```

2. **启动服务**：
   ```bash
   docker-compose up -d
   ```

3. **访问服务**：
   - 浏览器打开 `http://localhost:3001`
   - 输入设置的密码进行访问

### 方式二：直接使用Docker

```bash
# 构建镜像
docker build -t seedmanage .

# 运行容器（不带密码保护）
docker run -d -p 3001:3001 --name seedmanage seedmanage

# 运行容器（带密码保护）
docker run -d -p 3001:3001 -e PASSWORD='你的密码' --name seedmanage seedmanage
```

## 🌍 Render部署

### 自动部署（推荐）

1. 将代码推送到GitHub仓库
2. 在[Render](https://render.com)上创建新的Web Service
3. 连接到你的GitHub仓库
4. 使用预设配置或手动设置：
   - **Build Command**: `cd backend && cp -r ../frontend ./cmd/server/ && go mod download && go build -ldflags="-s -w" -o ../seedmanage ./cmd/server`
   - **Start Command**: `./seedmanage`
   - **Environment**: Go
   - **Plan**: Free

### 配置文件部署

Render支持使用`render.yaml`配置文件进行部署：

1. 将`render.yaml`文件放到项目根目录
2. 在Render控制台中选择"使用现有render.yaml"
3. 自动配置所有环境变量

### 环境变量配置

在Render控制台中设置以下环境变量：

```bash
PORT=10000
PASSWORD=your_password_here
DEFAULT_ADAPTER=apibay
FALLBACK_ADAPTER=sample
SAMPLE_DATA_FILE=data/sampleResults.json
SEARCH_HISTORY_FILE=data/searchHistory.json
```

## 🔐 密码保护

### 设置密码

密码通过环境变量`PASSWORD`设置：

```bash
# Docker Compose
environment:
  PASSWORD: "我的密码123"

# Docker命令行
docker run -e PASSWORD='我的密码123' ...

# Render环境变量
PASSWORD=我的密码123
```

### 密码特性

- **可选设置**：不设置PASSWORD环境变量则无密码保护
- **持久登录**：使用Cookie保存登录状态24小时
- **安全存储**：密码存储在HttpOnly Cookie中
- **自动验证**：所有API和页面请求都会验证密码

## 🏗️ 构建脚本

### 使用构建脚本

```bash
# 构建Docker镜像（版本号可选）
./docker-build.sh v1.0.0

# 推送镜像到Docker Hub
docker push seedmanage:v1.0.0
```

### 手动构建

```bash
# 1. 准备前端文件
cd backend
cp -r ../frontend ./cmd/server/

# 2. 构建Go应用
go mod download
go build -ldflags="-s -w" -o seedmanage ./cmd/server

# 3. 构建Docker镜像
docker build -t seedmanage .

# 4. 测试运行
docker run -p 3001:3001 -e PASSWORD='test123' seedmanage
```

## 📁 数据持久化

### 搜索历史持久化

默认情况下，搜索历史存储在容器内，重启后会丢失。要持久化历史记录：

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data:rw
```

### 自定义数据路径

```bash
# 使用环境变量指定路径
-e SEARCH_HISTORY_FILE=/data/my-searchHistory.json
-e SAMPLE_DATA_FILE=/data/my-sampleResults.json
```

## 🔧 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3001 | 服务端口 |
| `PASSWORD` | (空) | 访问密码，不设置则无密码保护 |
| `DEFAULT_ADAPTER` | apibay | 默认搜索适配器 |
| `FALLBACK_ADAPTER` | sample | 备用搜索适配器 |
| `MAGNET_SEARCH_ENDPOINT` | https://apibay.org/q.php | APIBay端点 |
| `NYAA_ENDPOINT` | https://nyaaapi.onrender.com/nyaa | Nyaa端点 |
| `SUKEBEI_ENDPOINT` | https://nyaaapi.onrender.com/sukebei | Sukebei端点 |
| `SAMPLE_DATA_FILE` | data/sampleResults.json | 示例数据文件路径 |
| `SEARCH_HISTORY_FILE` | data/searchHistory.json | 搜索历史文件路径 |

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 使用不同端口
   -p 8080:3001
   PORT=3001  # 容器内端口
   ```

2. **权限问题**
   ```bash
   # 确保数据目录有写权限
   chmod 755 ./data
   ```

3. **构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   docker build --no-cache -t seedmanage .
   ```

### 日志查看

```bash
# Docker Compose
docker-compose logs -f seedmanage

# Docker
docker logs -f seedmanage
```

### 健康检查

```bash
# 手动健康检查
curl http://localhost:3001/

# Docker健康状态
docker inspect seedmanage | grep Health -A 10
```

## 🚀 性能优化

### 生产环境建议

1. **使用外部数据库**：将历史记录存储到Redis或PostgreSQL
2. **启用HTTPS**：配置SSL证书（Render自动提供）
3. **缓存优化**：增加结果缓存减少API调用
4. **监控**：配置应用监控和告警

### 资源限制

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.50'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```