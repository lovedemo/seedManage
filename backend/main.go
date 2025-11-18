package main

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "log"
    "net/http"
    "net/url"
    "os"
    "sort"
    "strconv"
    "strings"
    "sync"
    "time"
)

var baseTrackers = []string{
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.tiny-vps.com:6969/announce",
}

const (
    defaultAdapterEnv  = "DEFAULT_ADAPTER"
    fallbackAdapterEnv = "FALLBACK_ADAPTER"
    portEnv            = "PORT"
    apibayEndpointEnv  = "MAGNET_SEARCH_ENDPOINT"
    sampleDataEnv      = "SAMPLE_DATA_FILE"
)

type SearchResult struct {
    Title     string     `json:"title"`
    Magnet    string     `json:"magnet"`
    InfoHash  string     `json:"infoHash,omitempty"`
    Trackers  []string   `json:"trackers,omitempty"`
    Seeders   *int       `json:"seeders"`
    Leechers  *int       `json:"leechers"`
    Size      *int64     `json:"size"`
    SizeLabel string     `json:"sizeLabel,omitempty"`
    Uploaded  *time.Time `json:"uploaded"`
    Category  string     `json:"category,omitempty"`
    Source    string     `json:"source,omitempty"`
}

type SearchMeta struct {
    Mode                 string `json:"mode"`
    Adapter              string `json:"adapter,omitempty"`
    AdapterName          string `json:"adapterName,omitempty"`
    AdapterDescription   string `json:"adapterDescription,omitempty"`
    AdapterEndpoint      string `json:"adapterEndpoint,omitempty"`
    ResultCount          int    `json:"resultCount"`
    AdapterError         string `json:"adapterError,omitempty"`
    FallbackUsed         bool   `json:"fallbackUsed"`
    FallbackAdapter      string `json:"fallbackAdapter,omitempty"`
    FallbackAdapterName  string `json:"fallbackAdapterName,omitempty"`
    FallbackAdapterError string `json:"fallbackAdapterError,omitempty"`
}

type SearchResponse struct {
    Query   string        `json:"query"`
    Results []SearchResult `json:"results"`
    Meta    SearchMeta    `json:"meta"`
}

type Adapter interface {
    ID() string
    Name() string
    Description() string
    Endpoint() string
    Search(ctx context.Context, term string) ([]SearchResult, error)
}

type AdapterInfo struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"`
    Endpoint    string `json:"endpoint,omitempty"`
    Default     bool   `json:"default"`
    Fallback    bool   `json:"fallback"`
}

type AdapterRegistry struct {
    mu         sync.RWMutex
    adapters   map[string]Adapter
    defaultID  string
    fallbackID string
}

func NewAdapterRegistry() *AdapterRegistry {
    return &AdapterRegistry{
        adapters: make(map[string]Adapter),
    }
}

func (r *AdapterRegistry) Register(adapter Adapter) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.adapters[adapter.ID()] = adapter
}

func (r *AdapterRegistry) Configure(defaultID, fallbackID string) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    if len(r.adapters) == 0 {
        return errors.New("no adapters registered")
    }

    if defaultID != "" {
        if _, ok := r.adapters[defaultID]; ok {
            r.defaultID = defaultID
        } else {
            return fmt.Errorf("default adapter %s not registered", defaultID)
        }
    }

    if r.defaultID == "" {
        for id := range r.adapters {
            r.defaultID = id
            break
        }
    }

    if fallbackID != "" && fallbackID != r.defaultID {
        if _, ok := r.adapters[fallbackID]; ok {
            r.fallbackID = fallbackID
        } else {
            return fmt.Errorf("fallback adapter %s not registered", fallbackID)
        }
    }

    return nil
}

func (r *AdapterRegistry) Get(id string) (Adapter, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    adapter, ok := r.adapters[id]
    return adapter, ok
}

func (r *AdapterRegistry) Default() (Adapter, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    if r.defaultID == "" {
        return nil, false
    }
    adapter, ok := r.adapters[r.defaultID]
    return adapter, ok
}

func (r *AdapterRegistry) DefaultID() string {
    r.mu.RLock()
    defer r.mu.RUnlock()
    return r.defaultID
}

func (r *AdapterRegistry) Fallback(excludeID string) (Adapter, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    if r.fallbackID == "" || r.fallbackID == excludeID {
        return nil, false
    }
    adapter, ok := r.adapters[r.fallbackID]
    return adapter, ok
}

func (r *AdapterRegistry) List() []AdapterInfo {
    r.mu.RLock()
    defer r.mu.RUnlock()

    infos := make([]AdapterInfo, 0, len(r.adapters))
    for id, adapter := range r.adapters {
        infos = append(infos, AdapterInfo{
            ID:          id,
            Name:        adapter.Name(),
            Description: adapter.Description(),
            Endpoint:    adapter.Endpoint(),
            Default:     id == r.defaultID,
            Fallback:    id == r.fallbackID,
        })
    }

    sort.Slice(infos, func(i, j int) bool {
        if infos[i].Default {
            return true
        }
        if infos[j].Default {
            return false
        }
        return infos[i].ID < infos[j].ID
    })

    return infos
}

type APIService struct {
    registry *AdapterRegistry
}

func NewAPIService(registry *AdapterRegistry) *APIService {
    return &APIService{registry: registry}
}

func (s *APIService) routes() http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/health", s.withJSON(s.handleHealth))
    mux.HandleFunc("/api/adapters", s.withJSON(s.handleAdapters))
    mux.HandleFunc("/api/search", s.withJSON(s.handleSearch))
    return s.cors(mux)
}

type jsonHandler func(http.ResponseWriter, *http.Request) error

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

func (s *APIService) handleHealth(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return methodNotAllowedError(r.Method)
    }
    payload := map[string]any{
        "status":          "ok",
        "time":            time.Now().UTC(),
        "defaultAdapter":  s.registry.DefaultID(),
        "adapters":        s.registry.List(),
    }
    return s.writeJSON(w, payload, http.StatusOK)
}

func (s *APIService) handleAdapters(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return methodNotAllowedError(r.Method)
    }
    payload := map[string]any{
        "adapters":       s.registry.List(),
        "defaultAdapter": s.registry.DefaultID(),
    }
    return s.writeJSON(w, payload, http.StatusOK)
}

func (s *APIService) handleSearch(w http.ResponseWriter, r *http.Request) error {
    if r.Method != http.MethodGet {
        return methodNotAllowedError(r.Method)
    }

    query := strings.TrimSpace(r.URL.Query().Get("q"))
    if query == "" {
        return clientError{message: "请提供搜索关键字或磁力链接。"}
    }

    if strings.HasPrefix(strings.ToLower(query), "magnet:?") {
        result, err := parseMagnetLink(query)
        if err != nil {
            return clientError{message: err.Error()}
        }
        response := SearchResponse{
            Query:   query,
            Results: []SearchResult{result},
            Meta: SearchMeta{
                Mode:        "magnet",
                ResultCount: 1,
            },
        }
        return s.writeJSON(w, response, http.StatusOK)
    }

    adapterID := strings.TrimSpace(r.URL.Query().Get("adapter"))
    if adapterID == "" {
        adapterID = s.registry.DefaultID()
    }

    adapter, ok := s.registry.Get(adapterID)
    if !ok {
        return clientError{message: fmt.Sprintf("未知的适配器: %s", adapterID)}
    }

    results, err := adapter.Search(r.Context(), query)

    meta := SearchMeta{
        Mode:               "search",
        Adapter:            adapter.ID(),
        AdapterName:        adapter.Name(),
        AdapterDescription: adapter.Description(),
        AdapterEndpoint:    adapter.Endpoint(),
        ResultCount:        len(results),
    }

    if err != nil {
        meta.AdapterError = err.Error()
    }

    if (err != nil || len(results) == 0) {
        if fallback, ok := s.registry.Fallback(adapter.ID()); ok {
            fallbackResults, fallbackErr := fallback.Search(r.Context(), query)
            if fallbackErr == nil && len(fallbackResults) > 0 {
                results = fallbackResults
                meta.ResultCount = len(results)
                meta.FallbackUsed = true
                meta.FallbackAdapter = fallback.ID()
                meta.FallbackAdapterName = fallback.Name()
            } else if fallbackErr != nil {
                meta.FallbackAdapter = fallback.ID()
                meta.FallbackAdapterName = fallback.Name()
                meta.FallbackAdapterError = fallbackErr.Error()
            }
        }
    }

    response := SearchResponse{
        Query:   query,
        Results: results,
        Meta:    meta,
    }

    return s.writeJSON(w, response, http.StatusOK)
}

func (s *APIService) writeJSON(w http.ResponseWriter, payload any, status int) error {
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    w.WriteHeader(status)
    return json.NewEncoder(w).Encode(payload)
}

func (s *APIService) writeJSONError(w http.ResponseWriter, err error) {
    status := http.StatusInternalServerError
    payload := map[string]any{
        "error": "服务器发生未知错误。",
    }

    switch e := err.(type) {
    case clientError:
        status = http.StatusBadRequest
        payload["error"] = e.message
    case methodNotAllowed:
        status = http.StatusMethodNotAllowed
        payload["error"] = e.Error()
    default:
        if err != nil {
            payload["error"] = err.Error()
        }
    }

    s.writeJSON(w, payload, status)
}

type clientError struct {
    message string
}

func (e clientError) Error() string { return e.message }

type methodNotAllowed struct {
    method string
}

func (m methodNotAllowed) Error() string {
    return fmt.Sprintf("方法 %s 不被允许", m.method)
}

func methodNotAllowedError(method string) error {
    return methodNotAllowed{method: method}
}

type apibayAdapter struct {
    endpoint string
    headers  http.Header
    client   *http.Client
    trackers []string
}

func NewAPIBayAdapter(endpoint string, trackers []string) Adapter {
    return &apibayAdapter{
        endpoint: endpoint,
        headers: http.Header{
            "User-Agent": []string{"magnetsearch-backend/1.0"},
        },
        client: &http.Client{Timeout: 8 * time.Second},
        trackers: append([]string(nil), trackers...),
    }
}

func (a *apibayAdapter) ID() string          { return "apibay" }
func (a *apibayAdapter) Name() string        { return "The Pirate Bay (apibay.org)" }
func (a *apibayAdapter) Description() string { return "通过 apibay.org 提供的公开 API 检索资源" }
func (a *apibayAdapter) Endpoint() string    { return a.endpoint }

func (a *apibayAdapter) Search(ctx context.Context, term string) ([]SearchResult, error) {
    u, err := url.Parse(a.endpoint)
    if err != nil {
        return nil, fmt.Errorf("invalid apibay endpoint: %w", err)
    }

    q := u.Query()
    q.Set("q", term)
    u.RawQuery = q.Encode()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
    if err != nil {
        return nil, err
    }
    req.Header = a.headers.Clone()

    resp, err := a.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
        return nil, fmt.Errorf("remote service error: %s - %s", resp.Status, string(body))
    }

    var payload []struct {
        Name     string `json:"name"`
        InfoHash string `json:"info_hash"`
        Seeders  string `json:"seeders"`
        Leechers string `json:"leechers"`
        Size     string `json:"size"`
        Added    string `json:"added"`
        Category string `json:"category"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
        return nil, err
    }

    results := make([]SearchResult, 0, len(payload))

    for _, item := range payload {
        if item.InfoHash == "" || item.Name == "" {
            continue
        }

        magnet := buildMagnetLink(item.InfoHash, item.Name, a.trackers)

        var seedersPtr *int
        if seeders, err := strconv.Atoi(item.Seeders); err == nil {
            seedersPtr = ptrInt(seeders)
        }

        var leechersPtr *int
        if leechers, err := strconv.Atoi(item.Leechers); err == nil {
            leechersPtr = ptrInt(leechers)
        }

        var sizePtr *int64
        var sizeLabel string
        if size, err := strconv.ParseInt(item.Size, 10, 64); err == nil && size > 0 {
            sizePtr = ptrInt64(size)
            sizeLabel = formatSize(size)
        }

        var uploadedPtr *time.Time
        if item.Added != "" {
            if ts, err := strconv.ParseInt(item.Added, 10, 64); err == nil && ts > 0 {
                t := time.Unix(ts, 0).UTC()
                uploadedPtr = &t
            }
        }

        category := item.Category
        if category == "0" || category == "" {
            category = "未知"
        }

        results = append(results, SearchResult{
            Title:     item.Name,
            Magnet:    magnet,
            InfoHash:  strings.ToUpper(item.InfoHash),
            Trackers:  append([]string(nil), a.trackers...),
            Seeders:   seedersPtr,
            Leechers:  leechersPtr,
            Size:      sizePtr,
            SizeLabel: sizeLabel,
            Uploaded:  uploadedPtr,
            Category:  category,
            Source:    a.ID(),
        })
    }

    return results, nil
}

type sampleAdapter struct {
    items    []SearchResult
    trackers []string
}

func NewSampleAdapter(path string) (Adapter, error) {
    content, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("加载本地示例数据失败: %w", err)
    }

    var raw []struct {
        Title    string   `json:"title"`
        Size     int64    `json:"size"`
        Seeders  int      `json:"seeders"`
        Leechers int      `json:"leechers"`
        Magnet   string   `json:"magnet"`
        Uploaded string   `json:"uploaded"`
        InfoHash string   `json:"infoHash"`
        Category string   `json:"category"`
        Source   string   `json:"source"`
        Trackers []string `json:"trackers"`
    }

    if err := json.Unmarshal(content, &raw); err != nil {
        return nil, err
    }

    items := make([]SearchResult, 0, len(raw))

    for _, item := range raw {
        var uploadedPtr *time.Time
        if item.Uploaded != "" {
            if t, err := time.Parse(time.RFC3339, item.Uploaded); err == nil {
                uploadedPtr = &t
            }
        }

        var seedersPtr *int
        if item.Seeders >= 0 {
            seedersPtr = ptrInt(item.Seeders)
        }

        var leechersPtr *int
        if item.Leechers >= 0 {
            leechersPtr = ptrInt(item.Leechers)
        }

        var sizePtr *int64
        sizeLabel := ""
        if item.Size > 0 {
            sizePtr = ptrInt64(item.Size)
            sizeLabel = formatSize(item.Size)
        }

        trackers := item.Trackers
        if len(trackers) == 0 {
            trackers = nil
        }

        items = append(items, SearchResult{
            Title:     item.Title,
            Magnet:    item.Magnet,
            InfoHash:  strings.ToUpper(item.InfoHash),
            Trackers:  trackers,
            Seeders:   seedersPtr,
            Leechers:  leechersPtr,
            Size:      sizePtr,
            SizeLabel: sizeLabel,
            Uploaded:  uploadedPtr,
            Category:  item.Category,
            Source:    coalesce(item.Source, "local-sample"),
        })
    }

    return &sampleAdapter{
        items: items,
    }, nil
}

func (s *sampleAdapter) ID() string          { return "sample" }
func (s *sampleAdapter) Name() string        { return "本地示例数据" }
func (s *sampleAdapter) Description() string { return "使用仓库内置示例结果进行匹配" }
func (s *sampleAdapter) Endpoint() string    { return "local-data" }

func (s *sampleAdapter) Search(ctx context.Context, term string) ([]SearchResult, error) {
    lower := strings.ToLower(term)
    results := make([]SearchResult, 0)
    for _, item := range s.items {
        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        default:
        }

        if strings.Contains(strings.ToLower(item.Title), lower) || strings.Contains(strings.ToLower(item.InfoHash), strings.ToLower(term)) {
            results = append(results, item)
        }
    }
    return results, nil
}

func parseMagnetLink(raw string) (SearchResult, error) {
    u, err := url.Parse(raw)
    if err != nil {
        return SearchResult{}, fmt.Errorf("无效的磁力链接: %w", err)
    }
    if u.Scheme != "magnet" {
        return SearchResult{}, fmt.Errorf("仅支持磁力链接")
    }

    params := u.Query()
    title := coalesce(decodeLabel(params.Get("dn")), "磁力链接")
    xt := params.Get("xt")
    infoHash := ""
    if xt != "" {
        parts := strings.Split(xt, ":")
        infoHash = strings.ToUpper(parts[len(parts)-1])
    }

    trackers := make([]string, 0, len(params["tr"]))
    for _, tr := range params["tr"] {
        trackers = append(trackers, decodeLabel(tr))
    }

    return SearchResult{
        Title:    title,
        Magnet:   raw,
        InfoHash: infoHash,
        Trackers: trackers,
        Seeders:  nil,
        Leechers: nil,
        Size:     nil,
        Category: "Direct Magnet",
        Source:   "magnet-link",
    }, nil
}

func buildMagnetLink(infoHash, title string, trackers []string) string {
    var builder strings.Builder
    builder.WriteString("magnet:?xt=urn:btih:")
    builder.WriteString(strings.ToUpper(infoHash))
    builder.WriteString("&dn=")
    builder.WriteString(url.QueryEscape(title))
    for _, tracker := range trackers {
        builder.WriteString("&tr=")
        builder.WriteString(url.QueryEscape(tracker))
    }
    return builder.String()
}

func decodeLabel(v string) string {
    if v == "" {
        return v
    }
    replaced := strings.ReplaceAll(v, "+", " ")
    decoded, err := url.QueryUnescape(replaced)
    if err != nil {
        return replaced
    }
    return decoded
}

func formatSize(bytes int64) string {
    if bytes <= 0 {
        return ""
    }
    units := []string{"B", "KB", "MB", "GB", "TB", "PB"}
    value := float64(bytes)
    idx := 0
    for value >= 1024 && idx < len(units)-1 {
        value /= 1024
        idx++
    }
    precision := 0
    if value < 10 && idx > 0 {
        precision = 1
    }
    return fmt.Sprintf("%.*f %s", precision, value, units[idx])
}

func ptrInt(v int) *int       { return &v }
func ptrInt64(v int64) *int64 { return &v }

func coalesce(values ...string) string {
    for _, v := range values {
        if strings.TrimSpace(v) != "" {
            return v
        }
    }
    return ""
}

func getenv(key, defaultValue string) string {
    if value := strings.TrimSpace(os.Getenv(key)); value != "" {
        return value
    }
    return defaultValue
}

func main() {
    port := getenv(portEnv, "3001")
    apibayEndpoint := getenv(apibayEndpointEnv, "https://apibay.org/q.php")
    sampleDataPath := getenv(sampleDataEnv, "data/sampleResults.json")
    defaultAdapter := getenv(defaultAdapterEnv, "apibay")
    fallbackAdapter := getenv(fallbackAdapterEnv, "sample")

    registry := NewAdapterRegistry()

    registry.Register(NewAPIBayAdapter(apibayEndpoint, baseTrackers))

    if sampleAdapter, err := NewSampleAdapter(sampleDataPath); err != nil {
        log.Printf("[backend] 本地示例适配器不可用: %v", err)
    } else {
        registry.Register(sampleAdapter)
    }

    if err := registry.Configure(defaultAdapter, fallbackAdapter); err != nil {
        log.Printf("[backend] 适配器配置问题: %v", err)
    }

    api := NewAPIService(registry)

    srv := &http.Server{
        Addr:         ":" + port,
        Handler:      api.routes(),
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    log.Printf("[backend] 磁力搜索服务已启动，端口 %s", port)
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatalf("server error: %v", err)
    }
}
