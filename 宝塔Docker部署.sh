#!/bin/bash

# 🐳 NoPotato 宝塔面板Docker部署脚本
# 使用方法：chmod +x 宝塔Docker部署.sh && ./宝塔Docker部署.sh

echo "🐳 NoPotato 宝塔面板Docker部署"
echo "================================"

# 配置变量
PROJECT_PATH="/www/wwwroot/nopotato"
DOMAIN="potato.yeadon.cc"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先在宝塔面板安装Docker管理器"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "📦 安装docker-compose..."
    curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "📁 进入项目目录..."
cd $PROJECT_PATH

echo "🛑 停止现有容器..."
docker-compose down 2>/dev/null || true

echo "🧹 清理Docker缓存..."
docker system prune -f

echo "🔨 构建并启动Docker容器..."
docker-compose up -d --build

echo "⏳ 等待服务启动..."
sleep 30

echo "📊 检查容器状态..."
docker-compose ps

echo "🔍 检查服务健康状态..."

# 检查后端API
echo "检查后端API..."
for i in {1..10}; do
    if curl -f http://localhost:5000/ > /dev/null 2>&1; then
        echo "✅ 后端API启动成功"
        break
    fi
    echo "⏳ 等待后端启动... ($i/10)"
    sleep 3
done

# 检查前端
echo "检查前端服务..."
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ 前端服务启动成功"
else
    echo "⚠️ 前端服务可能还在启动中"
fi

echo ""
echo "🎉 Docker部署完成！"
echo ""
echo "📱 访问地址："
echo "   HTTP:  http://$DOMAIN"
echo "   HTTPS: https://$DOMAIN (需要配置SSL证书)"
echo "   本地:  http://服务器IP"
echo ""
echo "🔧 管理命令："
echo "   查看状态: docker-compose ps"
echo "   查看日志: docker-compose logs -f"
echo "   重启服务: docker-compose restart"
echo "   停止服务: docker-compose down"
echo ""
echo "📊 容器信息："
echo "   前端容器: nopotato-frontend (端口80)"
echo "   后端容器: nopotato-backend (端口5000)"
echo "   数据库:   nopotato-mongodb (端口27017)"
echo ""
echo "🔒 下一步操作："
echo "1. 在宝塔面板配置域名 $DOMAIN"
echo "2. 申请SSL证书启用HTTPS"
echo "3. 配置防火墙开放80/443端口"
echo ""
echo "🍅 NoPotato已在宝塔面板Docker环境中运行！"
