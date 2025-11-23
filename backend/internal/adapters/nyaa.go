package adapters

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "strconv"
    "strings"
    "time"

    "github.com/seedmanage/backend/internal/models"
    "github.com/seedmanage/backend/internal/utils"
)

// Nyaa 实现通过 nyaaapi.onrender.com 进行搜索的适配器
type Nyaa struct {
    endpoint string
    headers  http.Header
    client   *http.Client
    trackers []string
}

// NewNyaa 创建一个新的 Nyaa 适配器
func NewNyaa(endpoint string, trackers []string) models.Adapter {
    return &Nyaa{
        endpoint: endpoint,
        headers: http.Header{
            "User-Agent": []string{"magnetsearch-backend/1.0"},
        },
        client:   &http.Client{Timeout: 10 * time.Second},
        trackers: append([]string(nil), trackers...),
    }
}

func (n *Nyaa) ID() string          { return "nyaa" }
func (n *Nyaa) Name() string        { return "Nyaa" }
func (n *Nyaa) Description() string { return "通过 nyaaapi.onrender.com 提供的 API 检索资源" }
func (n *Nyaa) Endpoint() string    { return n.endpoint }

// Search 执行搜索
func (n *Nyaa) Search(ctx context.Context, term string) ([]models.SearchResult, error) {
    return n.SearchWithOptions(ctx, models.SearchOptions{Query: term, Page: 1})
}

// SearchWithOptions 执行搜索，支持分页
func (n *Nyaa) SearchWithOptions(ctx context.Context, options models.SearchOptions) ([]models.SearchResult, error) {
    u, err := url.Parse(n.endpoint)
    if err != nil {
        return nil, fmt.Errorf("invalid nyaa endpoint: %w", err)
    }

    q := u.Query()
    q.Set("q", options.Query)
    q.Set("page", strconv.Itoa(options.Page))
    u.RawQuery = q.Encode()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
    if err != nil {
        return nil, err
    }
    req.Header = n.headers.Clone()

    resp, err := n.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
        return nil, fmt.Errorf("remote service error: %s - %s", resp.Status, string(body))
    }

    var response struct {
        Count int `json:"count"`
        Data  []struct {
            Title    string `json:"title"`
            Magnet   string `json:"magnet"`
            Seeders  int    `json:"seeders"`
            Leechers int    `json:"leechers"`
            Size     string `json:"size"`
            Time     string `json:"time"`
            Category string `json:"category"`
        } `json:"data"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
        return nil, err
    }

    payload := response.Data

    results := make([]models.SearchResult, 0, len(payload))

    for _, item := range payload {
        if item.Magnet == "" {
            continue
        }

        if item.Title == "" {
            continue
        }

        magnet := item.Magnet
        infoHash := extractInfoHashFromMagnet(item.Magnet)

        seedersPtr := utils.PtrInt(item.Seeders)
        leechersPtr := utils.PtrInt(item.Leechers)

        var sizePtr *int64
        var sizeLabel string
        if item.Size != "" {
            sizeLabel = item.Size
            if sizeBytes := parseSizeString(item.Size); sizeBytes > 0 {
                sizePtr = utils.PtrInt64(sizeBytes)
            }
        }

        var uploadedPtr *time.Time
        if item.Time != "" {
            if t, err := time.Parse(time.RFC3339, item.Time); err == nil {
                uploadedPtr = &t
            } else if t, err := time.Parse("2006-01-02 15:04:05", item.Time); err == nil {
                uploadedPtr = &t
            } else if t, err := time.Parse("2006-01-02 15:04", item.Time); err == nil {
                uploadedPtr = &t
            }
        }

        category := item.Category
        if category == "" {
            category = "未知"
        }

        results = append(results, models.SearchResult{
            Title:     item.Title,
            Magnet:    magnet,
            InfoHash:  strings.ToUpper(infoHash),
            Trackers:  append([]string(nil), n.trackers...),
            Seeders:   seedersPtr,
            Leechers:  leechersPtr,
            Size:      sizePtr,
            SizeLabel: sizeLabel,
            Uploaded:  uploadedPtr,
            Category:  category,
            Source:    n.ID(),
        })
    }

    return results, nil
}

func extractInfoHashFromMagnet(magnetLink string) string {
    if !strings.HasPrefix(magnetLink, "magnet:?") {
        return ""
    }

    parts := strings.Split(magnetLink, "&")
    for _, part := range parts {
        if strings.HasPrefix(part, "xt=urn:btih:") {
            hash := strings.TrimPrefix(part, "xt=urn:btih:")
            return strings.ToUpper(hash)
        }
    }
    return ""
}

// parseSizeString 解析大小字符串（如 "2.0 GiB", "704.9 MiB"）到字节数
func parseSizeString(sizeStr string) int64 {
    sizeStr = strings.TrimSpace(sizeStr)
    parts := strings.Fields(sizeStr)
    if len(parts) != 2 {
        return 0
    }

    var value float64
    if _, err := fmt.Sscanf(parts[0], "%f", &value); err != nil {
        return 0
    }

    unit := strings.ToUpper(parts[1])
    var multiplier int64

    switch unit {
    case "B":
        multiplier = 1
    case "KIB", "KB":
        multiplier = 1024
    case "MIB", "MB":
        multiplier = 1024 * 1024
    case "GIB", "GB":
        multiplier = 1024 * 1024 * 1024
    case "TIB", "TB":
        multiplier = 1024 * 1024 * 1024 * 1024
    default:
        return 0
    }

    return int64(value * float64(multiplier))
}
