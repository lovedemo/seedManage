package service

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "strings"
    "time"

    "github.com/seedmanage/backend/internal/history"
    "github.com/seedmanage/backend/internal/models"
    "github.com/seedmanage/backend/internal/registry"
    "github.com/seedmanage/backend/internal/utils"
)

// APIService 提供 HTTP API 服务
type APIService struct {
    registry *registry.AdapterRegistry
    history  *history.Store
}

// New 创建一个新的 API 服务
func New(reg *registry.AdapterRegistry, historyStore *history.Store) *APIService {
    return &APIService{
        registry: reg,
        history:  historyStore,
    }
}

// Routes 配置所有的路由
func (s *APIService) Routes() http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/health", s.withJSON(s.handleHealth))
    mux.HandleFunc("/api/adapters", s.withJSON(s.handleAdapters))
    mux.HandleFunc("/api/search", s.withJSON(s.handleSearch))
    mux.HandleFunc("/api/history", s.withJSON(s.handleHistory))
    return s.cors(mux)
}

type jsonHandler func(http.ResponseWriter, *http.Request) error

// withJSON 包装处理器以支持 JSON 错误处理
func (s *APIService) withJSON(handler jsonHandler) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        err := handler(w, r)
        if err != nil {
            s.writeJSONError(w, err)
        }
    }
}

// cors 添加 CORS 支持
func (s *APIService) cors(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// handleHealth 处理健康检查请求
func (s *APIService) handleHealth(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return NewMethodNotAllowedError(r.Method)
    }
    payload := map[string]any{
        "status":         "ok",
        "time":           time.Now().UTC(),
        "defaultAdapter": s.registry.DefaultID(),
        "adapters":       s.registry.List(),
    }
    return s.writeJSON(w, payload, http.StatusOK)
}

// handleAdapters 处理获取适配器列表的请求
func (s *APIService) handleAdapters(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return NewMethodNotAllowedError(r.Method)
    }
    payload := map[string]any{
        "adapters":       s.registry.List(),
        "defaultAdapter": s.registry.DefaultID(),
    }
    return s.writeJSON(w, payload, http.StatusOK)
}

// handleHistory 返回搜索历史列表
func (s *APIService) handleHistory(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return NewMethodNotAllowedError(r.Method)
    }

    records := []history.Entry{}
    if s.history != nil {
        records = s.history.List()
    }

    payload := map[string]any{
        "history": records,
    }

    return s.writeJSON(w, payload, http.StatusOK)
}

// handleSearch 处理搜索请求
func (s *APIService) handleSearch(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return NewMethodNotAllowedError(r.Method)
    }

    query := strings.TrimSpace(r.URL.Query().Get("q"))
    if query == "" {
        return ClientError{Message: "请提供搜索关键字或磁力链接。"}
    }

    // 解析分页参数
    page := 1
    if pageStr := r.URL.Query().Get("page"); pageStr != "" {
        if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
            page = p
        }
    }

    // 如果是磁力链接，直接解析并返回
    if strings.HasPrefix(strings.ToLower(query), "magnet:?") {
        result, err := utils.ParseMagnetLink(query)
        if err != nil {
            return ClientError{Message: err.Error()}
        }
        response := models.SearchResponse{
            Query:   query,
            Results: []models.SearchResult{result},
            Meta: models.SearchMeta{
                Mode:        "magnet",
                ResultCount: 1,
            },
        }
        s.recordHistory(response)
        return s.writeJSON(w, response, http.StatusOK)
    }

    // 获取适配器并执行搜索
    adapterID := strings.TrimSpace(r.URL.Query().Get("adapter"))
    if adapterID == "" {
        adapterID = s.registry.DefaultID()
    }

    adapter, ok := s.registry.Get(adapterID)
    if !ok {
        return ClientError{Message: fmt.Sprintf("未知的适配器: %s", adapterID)}
    }

    searchOptions := models.SearchOptions{
        Query: query,
        Page:  page,
    }

    results, err := adapter.SearchWithOptions(r.Context(), searchOptions)

    meta := models.SearchMeta{
        Mode:               "search",
        Adapter:            adapter.ID(),
        AdapterName:        adapter.Name(),
        AdapterDescription: adapter.Description(),
        AdapterEndpoint:    adapter.Endpoint(),
        ResultCount:        len(results),
        CurrentPage:        page,
        HasPrevPage:        page > 1,
    }

    if err != nil {
        meta.AdapterError = err.Error()
    }

    // 尝试确定是否有下一页（基于返回的结果数量）
    // 对于支持分页的适配器，如果返回的结果数量等于预期的页面大小，可能还有下一页
    const expectedPageSize = 10
    if len(results) >= expectedPageSize {
        meta.HasNextPage = true
    }

    // 如果主适配器失败或无结果，尝试备用适配器
    if (err != nil || len(results) == 0) {
        if fallback, ok := s.registry.Fallback(adapter.ID()); ok {
            fallbackResults, fallbackErr := fallback.SearchWithOptions(r.Context(), searchOptions)
            if fallbackErr == nil && len(fallbackResults) > 0 {
                results = fallbackResults
                meta.ResultCount = len(results)
                meta.FallbackUsed = true
                meta.FallbackAdapter = fallback.ID()
                meta.FallbackAdapterName = fallback.Name()
                // 更新分页信息
                if len(fallbackResults) >= expectedPageSize {
                    meta.HasNextPage = true
                } else {
                    meta.HasNextPage = false
                }
            } else if fallbackErr != nil {
                meta.FallbackAdapter = fallback.ID()
                meta.FallbackAdapterName = fallback.Name()
                meta.FallbackAdapterError = fallbackErr.Error()
            }
        }
    }

    response := models.SearchResponse{
        Query:   query,
        Results: results,
        Meta:    meta,
    }

    s.recordHistory(response)

    return s.writeJSON(w, response, http.StatusOK)
}

func (s *APIService) recordHistory(response models.SearchResponse) {
    if s.history == nil {
        return
    }

    if err := s.history.Record(response); err != nil {
        log.Printf("[service] 保存搜索历史失败: %v", err)
    }
}

// writeJSON 写入 JSON 响应
func (s *APIService) writeJSON(w http.ResponseWriter, payload any, status int) error {
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    w.WriteHeader(status)
    return json.NewEncoder(w).Encode(payload)
}

// writeJSONError 写入错误响应
func (s *APIService) writeJSONError(w http.ResponseWriter, err error) {
    status := http.StatusInternalServerError
    payload := map[string]any{
        "error": "服务器发生未知错误。",
    }

    switch e := err.(type) {
    case ClientError:
        status = http.StatusBadRequest
        payload["error"] = e.Message
    case MethodNotAllowed:
        status = http.StatusMethodNotAllowed
        payload["error"] = e.Error()
    default:
        if err != nil {
            payload["error"] = err.Error()
        }
    }

    s.writeJSON(w, payload, status)
}

