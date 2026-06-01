# 多阶段构建Dockerfile
# 第一阶段：构建前端
FROM node:20-alpine AS node-builder
WORKDIR /frontend
COPY frontend-v2/package*.json ./
RUN npm install
COPY frontend-v2/ .
RUN npm run build

# 第二阶段：构建后端
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
COPY backend/ .
# 将前端构建产物复制到后端嵌入目录
COPY --from=node-builder /frontend/dist ./cmd/server/frontend/
COPY data/ ./data/

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -a -installsuffix cgo -o seedmanage ./cmd/server

# 第三阶段：运行
FROM alpine:3.18

WORKDIR /app

# 从构建阶段复制二进制文件和资源
COPY --from=go-builder /app/seedmanage .
COPY --from=go-builder /app/data ./data

# 设置权限
RUN chmod +x seedmanage

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["./seedmanage"]
