@echo off
chcp 65001 >nul
echo ====================================
echo   本地磁力搜索服务 - Windows 打包脚本
echo ====================================
echo.

cd /d "%~dp0backend"

echo [1/3] 准备构建目录...
if not exist bin mkdir bin

echo [2/3] 编译 Windows 可执行文件...
set GOOS=windows
set GOARCH=amd64
go build -ldflags="-s -w" -o bin/seedmanage-windows-amd64.exe ./cmd/server

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 编译失败！请检查错误信息。
    pause
    exit /b 1
)

echo.
echo [3/3] 创建发布包...
cd ..

if not exist release mkdir release
xcopy /Y /I backend\bin\seedmanage-windows-amd64.exe release\ >nul
xcopy /Y /I data\sampleResults.json release\data\ >nul

echo.
echo ====================================
echo ✅ 构建成功！
echo ====================================
echo.
echo 生成的文件：
echo   - release\seedmanage-windows-amd64.exe
echo   - release\data\sampleResults.json
echo.
echo 使用方法：
echo   1. 双击运行 seedmanage-windows-amd64.exe
echo   2. 在浏览器中打开 http://localhost:3001
echo   3. 如需修改端口，设置环境变量：set PORT=端口号
echo.
pause
