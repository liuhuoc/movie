@echo off
chcp 65001 > nul
echo ==========================================
echo   影视聚合播放器 - 本地启动
echo ==========================================
echo.

:: 检查Node.js
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    echo    官网: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 版本: 
node -v
echo.

:: 进入web目录
cd /d "%~dp0web" 2>nul
if %errorlevel% neq 0 (
    echo ❌ 找不到 web 目录
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    call npm install
    echo.
)

:: 启动开发服务器
echo 🚀 启动开发服务器...
echo.
echo    启动成功后访问: http://localhost:5173
echo    按 Ctrl+C 停止服务器
echo.
npm run dev

pause
