@echo off
setlocal EnableExtensions

chcp 65001 >nul
title 磁力搜索服务 - Windows 启动脚本

set "ROOT=%~dp0"

rem 防止某些环境（例如 cmd AutoRun）导致脚本被递归触发，从而无限打开窗口
if defined MAGNET_SEARCH_BOOTSTRAPPED exit /b 0
set "MAGNET_SEARCH_BOOTSTRAPPED=1"

echo ================================================
echo  启动磁力搜索服务（Windows）
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

rem ---------- Resolve Go bin dir and add to PATH ----------
for /f "usebackq delims=" %%G in (`go env GOBIN`) do set "GOBIN=%%G"
if defined GOBIN (
  set "GO_BIN_DIR=%GOBIN%"
) else (
  for /f "usebackq delims=" %%G in (`go env GOPATH`) do set "GOPATH=%%G"
  if not defined GOPATH (
    echo [错误] 无法获取 GOPATH，请检查 Go 安装是否正常。
    echo.
    pause
    exit /b 1
  )
  set "GO_BIN_DIR=%GOPATH%\bin"
)

echo %PATH% | find /I "%GO_BIN_DIR%" >nul
if errorlevel 1 (
  set "PATH=%PATH%;%GO_BIN_DIR%"
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

rem ---------- Avoid launching duplicate windows if ports are already in use ----------
set "START_BACKEND=1"
netstat -ano | findstr /C:":3001" >nul 2>nul
if not errorlevel 1 set "START_BACKEND=0"

set "START_FRONTEND=1"
netstat -ano | findstr /C:":5173" >nul 2>nul
if not errorlevel 1 set "START_FRONTEND=0"

echo.
echo [信息] 正在启动后端和前端...
echo.

if "%START_BACKEND%"=="1" (
  start "Backend (air)" /d "%ROOT%backend" cmd /k air
) else (
  echo [提示] 检测到端口 3001 已被占用，已跳过后端启动（可能已在运行）。
)

if "%START_FRONTEND%"=="1" (
  start "Frontend (serve)" /d "%ROOT%" cmd /k npm run dev
) else (
  echo [提示] 检测到端口 5173 已被占用，已跳过前端启动（可能已在运行）。
)

echo.
echo [完成] 已触发启动命令。
echo        若看到 cmd 窗口不断弹出/闪退，请检查系统是否配置了 cmd AutoRun。
echo.
pause
