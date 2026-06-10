#!/bin/bash

# 影视聚合播放器 - 本地启动脚本

echo "=========================================="
echo "  影视聚合播放器 - 本地启动"
echo "=========================================="
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    echo "   官网: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 进入web目录
cd "$(dirname "$0")/web" || exit

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo ""
echo "   启动成功后访问: http://localhost:5173"
echo "   按 Ctrl+C 停止服务器"
echo ""
npm run dev
