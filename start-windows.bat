@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul
title 磁力搜索服务 - Windows 启动脚本

set "ROOT=%~dp0"

echo ================================================
echo  🚀 启动磁力搜索服务（Windows）
echo ================================================
echo.
echo 将会启动：
echo  - 后端： http://localhost:3001  (Go + air 热重载)
echo  - 前端： http://localhost:5173  (serve 静态站点)
echo.

rem ---------- Dependency checks ----------
where go >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Go，请先安装 Go 并确保 go 在 PATH 中。
  echo        下载地址：https://go.dev/dl/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js / npm，请先安装 Node.js 并确保 npm 在 PATH 中。
  echo        下载地址：https://nodejs.org/
  echo.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%G in (`go env GOPATH`) do set "GOPATH=%%G"
if not defined GOPATH (
  echo [错误] 无法获取 GOPATH，请检查 Go 安装是否正常。
  echo.
  pause
  exit /b 1
)

rem Ensure GOPATH\bin is on PATH so we can run tools installed by `go install`
echo %PATH% | find /I "%GOPATH%\bin" >nul
if errorlevel 1 (
  set "PATH=%PATH%;%GOPATH%\bin"
)

rem ---------- Install backend dev tools (air/goimports) if missing ----------
where air >nul 2>nul
if errorlevel 1 (
  echo [信息] 未检测到 air，正在安装...
  go install github.com/air-verse/air@latest
  if errorlevel 1 (
    echo [错误] air 安装失败。
    echo.
    pause
    exit /b 1
  )
)

where goimports >nul 2>nul
if errorlevel 1 (
  echo [信息] 未检测到 goimports，正在安装...
  go install golang.org/x/tools/cmd/goimports@latest
  if errorlevel 1 (
    echo [错误] goimports 安装失败。
    echo.
    pause
    exit /b 1
  )
)

rem ---------- Install frontend deps if needed ----------
if not exist "%ROOT%node_modules" (
  echo [信息] 未检测到 node_modules，正在执行 npm install...
  pushd "%ROOT%" >nul
  call npm install
  if errorlevel 1 (
    popd >nul
    echo [错误] npm install 失败。
    echo.
    pause
    exit /b 1
  )
  popd >nul
)

echo.
echo [信息] 正在启动后端和前端（会打开两个命令行窗口）...
echo.

start "Backend (air)" cmd /k "cd /d \"%ROOT%backend\" ^&^& air"
start "Frontend (serve)" cmd /k "cd /d \"%ROOT%\" ^&^& npm run dev"

echo.
echo [完成] 已触发启动命令。
echo        关闭本窗口不会停止已打开的后端/前端窗口。
echo.
pause
