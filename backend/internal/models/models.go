package models

import (
	"context"
	"time"
)

// SearchResult 表示单个搜索结果
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

// SearchMeta 包含搜索元数据信息
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

// SearchResponse 是搜索 API 的响应结构
type SearchResponse struct {
	Query   string         `json:"query"`
	Results []SearchResult `json:"results"`
	Meta    SearchMeta     `json:"meta"`
}

// Adapter 定义搜索适配器接口
type Adapter interface {
	ID() string
	Name() string
	Description() string
	Endpoint() string
	Search(ctx context.Context, term string) ([]SearchResult, error)
}

// AdapterInfo 包含适配器的基本信息
type AdapterInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Endpoint    string `json:"endpoint,omitempty"`
	Default     bool   `json:"default"`
	Fallback    bool   `json:"fallback"`
}

