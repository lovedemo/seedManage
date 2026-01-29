package main

import (
    "embed"
    "errors"
    "io/fs"
    "log"
    "net/http"
    "time"

    "github.com/seedmanage/backend/internal/adapters"
    "github.com/seedmanage/backend/internal/config"
    "github.com/seedmanage/backend/internal/history"
    "github.com/seedmanage/backend/internal/registry"
    "github.com/seedmanage/backend/internal/service"
    "github.com/seedmanage/backend/internal/utils"
)

//go:embed frontend
var frontendFS embed.FS

// passwordMiddleware 密码保护中间件
func passwordMiddleware(password string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if password == "" {
            // 如果没有设置密码，直接通过
            next.ServeHTTP(w, r)
            return
        }

        // 检查是否已经有有效的密码Cookie
        if cookie, err := r.Cookie("auth_token"); err == nil {
            if cookie.Value == password {
                next.ServeHTTP(w, r)
                return
            }
        }

        // 检查POST请求的密码
        if r.Method == http.MethodPost {
            if r.URL.Path == "/api/login" {
                providedPassword := r.FormValue("password")
                if providedPassword == password {
                    // 设置认证Cookie
                    http.SetCookie(w, &http.Cookie{
                        Name:     "auth_token",
                        Value:    password,
                        Path:     "/",
                        MaxAge:   86400, // 24小时
                        Secure:   false, // 在生产环境中应该设为true（使用HTTPS）
                        HttpOnly: true,
                        SameSite: http.SameSiteLaxMode,
                    })
                    w.WriteHeader(http.StatusOK)
                    w.Write([]byte(`{"success": true}`))
                    return
                }
                w.WriteHeader(http.StatusUnauthorized)
                w.Write([]byte(`{"error": "密码错误"}`))
                return
            }
        }

        // 如果没有认证，显示登录页面
        w.Header().Set("Content-Type", "text/html; charset=utf-8")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>访问验证 - 磁力搜索服务</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 400px; margin: 100px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #333; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #555; }
        input[type="password"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #005a87; }
        .error { color: #d32f2f; margin-top: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 访问验证</h1>
        <form id="loginForm">
            <div class="form-group">
                <label for="password">请输入访问密码：</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">登录</button>
            <div id="error" class="error" style="display: none;"></div>
        </form>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const error = document.getElementById('error');
            error.style.display = 'none';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'password=' + encodeURIComponent(password)
                });
                
                if (response.ok) {
                    window.location.reload();
                } else {
                    const data = await response.json();
                    error.textContent = data.error || '密码错误';
                    error.style.display = 'block';
                }
            } catch (err) {
                error.textContent = '网络错误，请重试';
                error.style.display = 'block';
            }
        });
    </script>
</body>
</html>`))
    })
}

func main() {
    // 从环境变量读取配置
    port := utils.Getenv(config.PortEnv, "3001")
    apibayEndpoint := utils.Getenv(config.ApibayEndpointEnv, "https://apibay.org/q.php")
    nyaaEndpoint := utils.Getenv(config.NyaaEndpointEnv, "https://nyaaapi.onrender.com/nyaa")
    sukebeiEndpoint := utils.Getenv(config.SukebeiEndpointEnv, "https://nyaaapi.onrender.com/sukebei")
    sampleDataPath := utils.ResolvePath(utils.Getenv(config.SampleDataEnv, "data/sampleResults.json"))
    historyFilePath := utils.ResolvePath(utils.Getenv(config.SearchHistoryFileEnv, "data/searchHistory.json"))
    defaultAdapter := utils.Getenv(config.DefaultAdapterEnv, "apibay")
    fallbackAdapter := utils.Getenv(config.FallbackAdapterEnv, "sample")
    password := utils.Getenv(config.PasswordEnv, "")

    log.Printf("[backend] 磁力搜索服务启动中...")

    if password != "" {
        log.Printf("[backend] 密码保护已启用")
    } else {
        log.Printf("[backend] 未设置密码保护，所有访问将直接通过")
    }

    // 创建并配置适配器注册器
    reg := registry.New()

    // 注册 APIBay 适配器
    reg.Register(adapters.NewAPIBay(apibayEndpoint, config.BaseTrackers))

    // 注册 Nyaa 适配器
    reg.Register(adapters.NewNyaa(nyaaEndpoint, config.BaseTrackers))

    // 注册 Sukebei 适配器
    reg.Register(adapters.NewSukebei(sukebeiEndpoint, config.BaseTrackers))

    // 注册本地示例适配器（如果可用）
    if sampleAdapter, err := adapters.NewSample(sampleDataPath); err != nil {
        log.Printf("[backend] 本地示例适配器不可用: %v", err)
    } else {
        reg.Register(sampleAdapter)
    }

    // 配置默认和备用适配器
    if err := reg.Configure(defaultAdapter, fallbackAdapter); err != nil {
        log.Printf("[backend] 适配器配置问题: %v", err)
    }

    historyStore, err := history.NewStore(historyFilePath, history.DefaultHistoryLimit, history.DefaultResultsPerEntry)
    if err != nil {
        log.Fatalf("[backend] 无法初始化历史记录存储: %v", err)
    }

    // 创建 API 服务
    api := service.New(reg, historyStore)

    // 从嵌入的文件系统中提取前端内容
    frontendContent, err := fs.Sub(frontendFS, "frontend")
    if err != nil {
        log.Fatalf("[backend] 无法读取前端文件: %v", err)
    }

    // 创建主路由
    mux := http.NewServeMux()

    // 将 API 路由挂载到 /api/ 路径
    mux.Handle("/api/", passwordMiddleware(password, api.Routes()))

    // 静态文件服务（所有其他请求）
    mux.Handle("/", passwordMiddleware(password, http.FileServer(http.FS(frontendContent))))

    // 配置 HTTP 服务器
    srv := &http.Server{
        Addr:         ":" + port,
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    // 启动服务器
    log.Printf("[backend] 磁力搜索服务已启动，端口 %s", port)
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatalf("server error: %v", err)
    }
}
