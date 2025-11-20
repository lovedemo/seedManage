package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/seedmanage/backend/internal/models"
	"github.com/seedmanage/backend/internal/registry"
	"github.com/seedmanage/backend/internal/utils"
)

// APIService 提供 HTTP API 服务
type APIService struct {
	registry *registry.AdapterRegistry
}

// New 创建一个新的 API 服务
func New(reg *registry.AdapterRegistry) *APIService {
	return &APIService{registry: reg}
}

// Routes 配置所有的路由
func (s *APIService) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.withJSON(s.handleHealth))
	mux.HandleFunc("/api/adapters", s.withJSON(s.handleAdapters))
	mux.HandleFunc("/api/search", s.withJSON(s.handleSearch))
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

// handleSearch 处理搜索请求
func (s *APIService) handleSearch(w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodGet {
		return NewMethodNotAllowedError(r.Method)
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		return ClientError{Message: "请提供搜索关键字或磁力链接。"}
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

	results, err := adapter.Search(r.Context(), query)

	meta := models.SearchMeta{
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

	// 如果主适配器失败或无结果，尝试备用适配器
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

	response := models.SearchResponse{
		Query:   query,
		Results: results,
		Meta:    meta,
	}

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

