package adapters

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "strings"
    "time"

    "github.com/seedmanage/backend/internal/models"
    "github.com/seedmanage/backend/internal/utils"
)

// Sample 使用本地示例数据的适配器
type Sample struct {
    items []models.SearchResult
}

// NewSample 创建一个新的本地示例适配器
func NewSample(path string) (models.Adapter, error) {
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

    items := make([]models.SearchResult, 0, len(raw))

    for _, item := range raw {
        var uploadedPtr *time.Time
        if item.Uploaded != "" {
            if t, err := time.Parse(time.RFC3339, item.Uploaded); err == nil {
                uploadedPtr = &t
            }
        }

        var seedersPtr *int
        if item.Seeders >= 0 {
            seedersPtr = utils.PtrInt(item.Seeders)
        }

        var leechersPtr *int
        if item.Leechers >= 0 {
            leechersPtr = utils.PtrInt(item.Leechers)
        }

        var sizePtr *int64
        sizeLabel := ""
        if item.Size > 0 {
            sizePtr = utils.PtrInt64(item.Size)
            sizeLabel = utils.FormatSize(item.Size)
        }

        trackers := item.Trackers
        if len(trackers) == 0 {
            trackers = nil
        }

        items = append(items, models.SearchResult{
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
            Source:    utils.Coalesce(item.Source, "local-sample"),
        })
    }

    return &Sample{
        items: items,
    }, nil
}

func (s *Sample) ID() string          { return "sample" }
func (s *Sample) Name() string        { return "本地示例数据" }
func (s *Sample) Description() string { return "使用仓库内置示例结果进行匹配" }
func (s *Sample) Endpoint() string    { return "local-data" }

// Search 在本地数据中搜索匹配的项
func (s *Sample) Search(ctx context.Context, term string) ([]models.SearchResult, error) {
    return s.SearchWithOptions(ctx, models.SearchOptions{Query: term, Page: 1})
}

// SearchWithOptions 在本地数据中搜索匹配的项，支持分页
func (s *Sample) SearchWithOptions(ctx context.Context, options models.SearchOptions) ([]models.SearchResult, error) {
    lower := strings.ToLower(options.Query)
    results := make([]models.SearchResult, 0)
    for _, item := range s.items {
        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        default:
        }

        if strings.Contains(strings.ToLower(item.Title), lower) || strings.Contains(strings.ToLower(item.InfoHash), strings.ToLower(options.Query)) {
            results = append(results, item)
        }
    }
    
    // 本地数据不支持真正的分页，但可以模拟分页效果
    const pageSize = 10
    start := (options.Page - 1) * pageSize
    end := start + pageSize
    
    if start >= len(results) {
        return []models.SearchResult{}, nil
    }
    
    if end > len(results) {
        end = len(results)
    }
    
    return results[start:end], nil
}

