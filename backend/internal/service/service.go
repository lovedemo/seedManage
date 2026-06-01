package service

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "strconv"
    "strings"
    "time"

    "github.com/seedmanage/backend/internal/collections"
    "github.com/seedmanage/backend/internal/config"
    "github.com/seedmanage/backend/internal/history"
    "github.com/seedmanage/backend/internal/models"
    "github.com/seedmanage/backend/internal/registry"
    "github.com/seedmanage/backend/internal/utils"
)

// APIService 提供 HTTP API 服务
type APIService struct {
    registry    *registry.AdapterRegistry
    history     *history.Store
    collections *collections.Store
}

// New 创建一个新的 API 服务
func New(reg *registry.AdapterRegistry, historyStore *history.Store, collStore *collections.Store) *APIService {
    return &APIService{
        registry:    reg,
        history:     historyStore,
        collections: collStore,
    }
}

// Routes 配置所有的路由
func (s *APIService) Routes() http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/health", s.withJSON(s.handleHealth))
    mux.HandleFunc("/api/adapters", s.withJSON(s.handleAdapters))
    mux.HandleFunc("/api/search", s.withJSON(s.handleSearch))
    mux.HandleFunc("/api/history", s.withJSON(s.handleHistory))
    mux.HandleFunc("/api/collections", s.withJSON(s.handleCollections))
    mux.HandleFunc("/api/collections/", s.withJSON(s.handleCollectionByID))
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
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
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
        "version":        config.Version,
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

// handleHistory 返回搜索历史列表或删除历史记录
func (s *APIService) handleHistory(w http.ResponseWriter, r *http.Request) error {
    switch r.Method {
    case http.MethodGet:
        records := []history.Entry{}
        if s.history != nil {
            records = s.history.List()
        }

        payload := map[string]any{
            "history": records,
        }

        return s.writeJSON(w, payload, http.StatusOK)
    
    case http.MethodDelete:
        id := strings.TrimSpace(r.URL.Query().Get("id"))
        if id == "" {
            return ClientError{Message: "请提供要删除的历史记录ID。"}
        }

        if s.history == nil {
            return ClientError{Message: "历史记录功能不可用。"}
        }

        if err := s.history.Delete(id); err != nil {
            return ClientError{Message: err.Error()}
        }

        payload := map[string]any{
            "message": "历史记录已删除",
        }

        return s.writeJSON(w, payload, http.StatusOK)
    
    default:
        return NewMethodNotAllowedError(r.Method)
    }
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

// handleCollections handles collection listing, creation, and CSV import
func (s *APIService) handleCollections(w http.ResponseWriter, r *http.Request) error {
    if s.collections == nil {
        return ClientError{Message: "集合功能不可用。"}
    }

    switch r.Method {
    case http.MethodGet:
        collections, err := s.collections.List()
        if err != nil {
            return ClientError{Message: err.Error()}
        }
        payload := map[string]any{
            "collections": collections,
        }
        return s.writeJSON(w, payload, http.StatusOK)

    case http.MethodPost:
        contentType := r.Header.Get("Content-Type")

        // Handle CSV import
        if strings.Contains(contentType, "multipart/form-data") {
            file, header, err := r.FormFile("file")
            if err != nil {
                return ClientError{Message: "请上传CSV文件。"}
            }
            defer file.Close()

            // Read file content
            data, err := io.ReadAll(file)
            if err != nil {
                return ClientError{Message: "无法读取上传的文件。"}
            }

            // Use filename without extension as collection name
            name := r.FormValue("name")
            if name == "" {
                name = strings.TrimSuffix(header.Filename, ".csv")
            }
            if name == "" {
                name = "导入的集合"
            }

            meta, err := s.collections.ImportCSV(name, string(data))
            if err != nil {
                return ClientError{Message: err.Error()}
            }

            payload := map[string]any{
                "message":    "集合已成功从CSV导入",
                "collection": meta,
            }
            return s.writeJSON(w, payload, http.StatusCreated)
        }

        // Handle JSON body for creating empty collection
        var body struct {
            Name string `json:"name"`
        }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            return ClientError{Message: "请提供有效的JSON数据。"}
        }
        if strings.TrimSpace(body.Name) == "" {
            return ClientError{Message: "请提供集合名称。"}
        }

        meta, err := s.collections.Create(strings.TrimSpace(body.Name))
        if err != nil {
            return ClientError{Message: err.Error()}
        }

        payload := map[string]any{
            "message":    "集合已创建",
            "collection": meta,
        }
        return s.writeJSON(w, payload, http.StatusCreated)

    default:
        return NewMethodNotAllowedError(r.Method)
    }
}

// handleCollectionByID handles individual collection operations
func (s *APIService) handleCollectionByID(w http.ResponseWriter, r *http.Request) error {
    if s.collections == nil {
        return ClientError{Message: "集合功能不可用。"}
    }

    // Extract collection ID from path: /api/collections/{id}
    id := strings.TrimPrefix(r.URL.Path, "/api/collections/")
    id = strings.TrimSuffix(id, "/")
    if id == "" {
        return ClientError{Message: "请提供集合ID。"}
    }

    // Check for sub-routes
    if strings.Contains(r.URL.Path, "/search") {
        id = strings.ReplaceAll(id, "/search", "")
        id = strings.ReplaceAll(id, "/items", "")
        id = strings.TrimSuffix(id, "/")
        return s.handleCollectionSearch(w, r, id)
    }
    if strings.Contains(r.URL.Path, "/items") {
        id = strings.ReplaceAll(id, "/items", "")
        id = strings.TrimSuffix(id, "/")
        return s.handleCollectionItems(w, r, id)
    }
    if strings.Contains(r.URL.Path, "/import") {
        id = strings.ReplaceAll(id, "/import", "")
        id = strings.TrimSuffix(id, "/")
        return s.handleCollectionImportToExisting(w, r, id)
    }

    switch r.Method {
    case http.MethodGet:
        cf, err := s.collections.Get(id)
        if err != nil {
            return ClientError{Message: err.Error()}
        }
        return s.writeJSON(w, cf, http.StatusOK)

    case http.MethodDelete:
        if err := s.collections.Delete(id); err != nil {
            return ClientError{Message: err.Error()}
        }
        payload := map[string]any{
            "message": "集合已删除",
        }
        return s.writeJSON(w, payload, http.StatusOK)

    default:
        return NewMethodNotAllowedError(r.Method)
    }
}

// handleCollectionItems handles adding and listing items within a collection
func (s *APIService) handleCollectionItems(w http.ResponseWriter, r *http.Request, collectionID string) error {
    switch r.Method {
    case http.MethodGet:
        cf, err := s.collections.Get(collectionID)
        if err != nil {
            return ClientError{Message: err.Error()}
        }
        
        // Return only items and total count for this endpoint
        payload := map[string]any{
            "items":      cf.Items,
            "totalCount": len(cf.Items),
            "totalPages": 1, // Store doesn't support pagination yet, return everything as 1 page
        }
        return s.writeJSON(w, payload, http.StatusOK)

    case http.MethodPost:
        // Attempt to decode as array first
        var items []models.CollectionItem
        body, err := io.ReadAll(r.Body)
        if err != nil {
            return ClientError{Message: "无法读取请求体"}
        }

        if err := json.Unmarshal(body, &items); err != nil {
            // Try decoding as a single item
            var item models.CollectionItem
            if err := json.Unmarshal(body, &item); err != nil {
                return ClientError{Message: "请提供有效的JSON数据(单个对象或数组)。"}
            }
            items = []models.CollectionItem{item}
        }

        if len(items) == 0 {
            return ClientError{Message: "请提供至少一个条目。"}
        }

        for i := range items {
            if strings.TrimSpace(items[i].Title) == "" {
                if strings.TrimSpace(items[i].Magnet) != "" {
                    items[i].Title = items[i].Magnet
                    if len(items[i].Title) > 60 {
                        items[i].Title = items[i].Title[:60] + "..."
                    }
                } else if strings.TrimSpace(items[i].Remarks) != "" {
                    items[i].Title = items[i].Remarks
                } else {
                    items[i].Title = "未命名条目"
                }
            }
        }

        var created []models.CollectionItem
        if len(items) == 1 {
            c, err := s.collections.AddItem(collectionID, items[0])
            if err != nil {
                return ClientError{Message: err.Error()}
            }
            created = []models.CollectionItem{*c}
        } else {
            var err error
            created, err = s.collections.AddItems(collectionID, items)
            if err != nil {
                return ClientError{Message: err.Error()}
            }
        }

        payload := map[string]any{
            "message": fmt.Sprintf("已成功添加 %d 个条目", len(created)),
            "items":   created,
        }
        return s.writeJSON(w, payload, http.StatusCreated)

    case http.MethodDelete:
        var body struct {
            Magnets []string `json:"magnets"`
        }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            return ClientError{Message: "请提供要删除的磁力链接列表。"}
        }

        if len(body.Magnets) == 0 {
            return ClientError{Message: "请提供至少一个要删除的磁力链接。"}
        }

        if err := s.collections.DeleteItems(collectionID, body.Magnets); err != nil {
            return ClientError{Message: err.Error()}
        }

        payload := map[string]any{
            "message": fmt.Sprintf("已成功删除 %d 个条目", len(body.Magnets)),
        }
        return s.writeJSON(w, payload, http.StatusOK)

    default:
        return NewMethodNotAllowedError(r.Method)
    }
}

// handleCollectionImportToExisting handles CSV import into an existing collection
func (s *APIService) handleCollectionImportToExisting(w http.ResponseWriter, r *http.Request, collectionID string) error {
    if r.Method != http.MethodPost {
        return NewMethodNotAllowedError(r.Method)
    }

    file, _, err := r.FormFile("file")
    if err != nil {
        return ClientError{Message: "请上传CSV文件。"}
    }
    defer file.Close()

    data, err := io.ReadAll(file)
    if err != nil {
        return ClientError{Message: "无法读取上传的文件。"}
    }

    items, err := s.collections.ImportCSVToCollection(collectionID, string(data))
    if err != nil {
        return ClientError{Message: err.Error()}
    }

    payload := map[string]any{
        "message": fmt.Sprintf("已成功导入 %d 个条目", len(items)),
        "count":   len(items),
    }
    return s.writeJSON(w, payload, http.StatusOK)
}

// handleCollectionSearch performs a keyword search using existing adapters but without saving to history
func (s *APIService) handleCollectionSearch(w http.ResponseWriter, r *http.Request, collectionID string) error {
    if r.Method != http.MethodGet {
        return NewMethodNotAllowedError(r.Method)
    }

    keyword := strings.TrimSpace(r.URL.Query().Get("q"))
    if keyword == "" {
        return ClientError{Message: "请提供搜索关键字。"}
    }

    // Perform search using existing adapters WITHOUT saving to history
    adapterID := strings.TrimSpace(r.URL.Query().Get("adapter"))
    if adapterID == "" {
        adapterID = s.registry.DefaultID()
    }

    adapter, ok := s.registry.Get(adapterID)
    if !ok {
        return ClientError{Message: fmt.Sprintf("未知的适配器: %s", adapterID)}
    }

    searchOptions := models.SearchOptions{
        Query: keyword,
        Page:  1,
    }

    results, err := adapter.SearchWithOptions(r.Context(), searchOptions)

    meta := models.SearchMeta{
        Mode:               "search",
        Adapter:            adapter.ID(),
        AdapterName:        adapter.Name(),
        AdapterDescription: adapter.Description(),
        AdapterEndpoint:    adapter.Endpoint(),
        ResultCount:        len(results),
        HasPrevPage:        false,
    }

    if err != nil {
        meta.AdapterError = err.Error()
    }

    const expectedPageSize = 10
    if len(results) >= expectedPageSize {
        meta.HasNextPage = true
    }

    // Try fallback if main adapter fails
    if (err != nil || len(results) == 0) {
        if fallback, ok := s.registry.Fallback(adapter.ID()); ok {
            fallbackResults, fallbackErr := fallback.SearchWithOptions(r.Context(), searchOptions)
            if fallbackErr == nil && len(fallbackResults) > 0 {
                results = fallbackResults
                meta.ResultCount = len(results)
                meta.FallbackUsed = true
                meta.FallbackAdapter = fallback.ID()
                meta.FallbackAdapterName = fallback.Name()
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
        Query:   keyword,
        Results: results,
        Meta:    meta,
    }

    // Do NOT save to history - this is a collection keyword search
    return s.writeJSON(w, response, http.StatusOK)
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

