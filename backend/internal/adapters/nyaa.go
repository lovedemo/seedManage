package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
	u, err := url.Parse(n.endpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid nyaa endpoint: %w", err)
	}

	q := u.Query()
	q.Set("q", term)
	q.Set("page", "1")
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

	var payload []struct {
		Name     string `json:"name"`
		InfoHash string `json:"info_hash"`
		Magnet   string `json:"magnet"`
		Seeders  int    `json:"seeders"`
		Leechers int    `json:"leechers"`
		Size     int64  `json:"size"`
		Date     string `json:"date"`
		Category string `json:"category"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	results := make([]models.SearchResult, 0, len(payload))

	for _, item := range payload {
		if item.InfoHash == "" && item.Magnet == "" {
			continue
		}

		if item.Name == "" {
			continue
		}

		var magnet string
		var infoHash string

		if item.Magnet != "" {
			magnet = item.Magnet
			if item.InfoHash != "" {
				infoHash = item.InfoHash
			} else {
				infoHash = extractInfoHashFromMagnet(item.Magnet)
			}
		} else if item.InfoHash != "" {
			infoHash = item.InfoHash
			magnet = utils.BuildMagnetLink(item.InfoHash, item.Name, n.trackers)
		}

		seedersPtr := utils.PtrInt(item.Seeders)
		leechersPtr := utils.PtrInt(item.Leechers)

		var sizePtr *int64
		var sizeLabel string
		if item.Size > 0 {
			sizePtr = utils.PtrInt64(item.Size)
			sizeLabel = utils.FormatSize(item.Size)
		}

		var uploadedPtr *time.Time
		if item.Date != "" {
			if t, err := time.Parse(time.RFC3339, item.Date); err == nil {
				uploadedPtr = &t
			} else if t, err := time.Parse("2006-01-02 15:04:05", item.Date); err == nil {
				uploadedPtr = &t
			}
		}

		category := item.Category
		if category == "" {
			category = "未知"
		}

		results = append(results, models.SearchResult{
			Title:     item.Name,
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
