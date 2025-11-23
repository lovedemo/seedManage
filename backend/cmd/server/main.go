package main

import (
    "errors"
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

func main() {
    // 从环境变量读取配置
    port := utils.Getenv(config.PortEnv, "3001")
    apibayEndpoint := utils.Getenv(config.ApibayEndpointEnv, "https://apibay.org/q.php")
    nyaaEndpoint := utils.Getenv(config.NyaaEndpointEnv, "https://nyaaapi.onrender.com/nyaa")
    sampleDataPath := utils.ResolvePath(utils.Getenv(config.SampleDataEnv, "data/sampleResults.json"))
    historyFilePath := utils.ResolvePath(utils.Getenv(config.SearchHistoryFileEnv, "data/searchHistory.json"))
    defaultAdapter := utils.Getenv(config.DefaultAdapterEnv, "apibay")
    fallbackAdapter := utils.Getenv(config.FallbackAdapterEnv, "sample")

    // 创建并配置适配器注册器
    reg := registry.New()

    // 注册 APIBay 适配器
    reg.Register(adapters.NewAPIBay(apibayEndpoint, config.BaseTrackers))

    // 注册 Nyaa 适配器
    reg.Register(adapters.NewNyaa(nyaaEndpoint, config.BaseTrackers))

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

    // 配置 HTTP 服务器
    srv := &http.Server{
        Addr:         ":" + port,
        Handler:      api.Routes(),
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
