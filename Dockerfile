# 多阶段构建Dockerfile
# 构建阶段
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY backend/ .
COPY frontend/ ./frontend/

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -a -installsuffix cgo -o seedmanage ./cmd/server

# 运行阶段
FROM alpine:3.18

WORKDIR /app

# 从构建阶段复制二进制文件和资源
COPY --from=builder /app/seedmanage .
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/data ./data

# 设置权限
RUN chmod +x seedmanage

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["./seedmanage"]