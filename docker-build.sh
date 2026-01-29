#!/bin/bash
set -e

echo "===================================="
echo "  Docker 构建和发布脚本"
echo "===================================="
echo ""

# 设置变量
IMAGE_NAME="seedmanage"
DOCKER_REGISTRY="docker.io"  # 可以修改为其他registry
VERSION=${1:-latest}
FULL_IMAGE_NAME="${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

echo "[1/5] 清理旧的构建文件..."
rm -rf backend/bin
rm -rf backend/cmd/server/frontend

echo "[2/5] 准备前端文件..."
cp -r frontend/ backend/cmd/server/

echo "[3/5] 构建Docker镜像..."
echo "镜像名称: $FULL_IMAGE_NAME"
docker build -t "$FULL_IMAGE_NAME" .

echo ""
echo "[4/5] 显示镜像信息..."
docker images | grep "$IMAGE_NAME"

echo ""
echo "[5/5] 测试运行..."
echo "正在启动测试容器..."
docker run -d -p 3001:3001 -e PASSWORD='test123' --name seedmanage-test "$FULL_IMAGE_NAME" || true
sleep 5

# 测试健康状态
if docker ps | grep -q seedmanage-test; then
    echo "✅ 容器启动成功！"
    echo ""
    echo "可用的Docker命令:"
    echo ""
    echo "停止测试容器:"
    echo "  docker stop seedmanage-test && docker rm seedmanage-test"
    echo ""
    echo "本地运行（不带密码）:"
    echo "  docker run -d -p 3001:3001 --name seedmanage $FULL_IMAGE_NAME"
    echo ""
    echo "本地运行（带密码）:"
    echo "  docker run -d -p 3001:3001 -e PASSWORD='你的密码' --name seedmanage $FULL_IMAGE_NAME"
    echo ""
    echo "推送到Docker Hub:"
    echo "  docker push $FULL_IMAGE_NAME"
    echo ""
    echo "从Docker Hub拉取并运行:"
    echo "  docker pull $FULL_IMAGE_NAME"
    echo "  docker run -d -p 3001:3001 -e PASSWORD='你的密码' --name seedmanage $FULL_IMAGE_NAME"
else
    echo "❌ 容器启动失败，请检查错误信息"
    docker logs seedmanage-test || true
fi

echo ""
echo "===================================="
echo "✅ Docker构建完成！"
echo "===================================="