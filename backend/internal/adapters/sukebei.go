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

// Sukebei 实现通过 nyaaapi.onrender.com/sukebei 进行搜索的适配器
type Sukebei struct {
	endpoint string
	headers  http.Header
	client   *http.Client
	trackers []string
}

// NewSukebei 创建一个新的 Sukebei 适配器
func NewSukebei(endpoint string, trackers []string) models.Adapter {
	return &Sukebei{
		endpoint: endpoint,
		headers: http.Header{
			"User-Agent": []string{"magnetsearch-backend/1.0"},
		},
		client:   &http.Client{Timeout: 10 * time.Second},
		trackers: append([]string(nil), trackers...),
	}
}

func (s *Sukebei) ID() string          { return "sukebei" }
func (s *Sukebei) Name() string        { return "Sukebei" }
func (s *Sukebei) Description() string { return "通过 nyaaapi.onrender.com 的 Sukebei 数据源检索资源" }
func (s *Sukebei) Endpoint() string    { return s.endpoint }

// Search 执行搜索
func (s *Sukebei) Search(ctx context.Context, term string) ([]models.SearchResult, error) {
	u, err := url.Parse(s.endpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid sukebei endpoint: %w", err)
	}

	q := u.Query()
	q.Set("q", term)
	q.Set("page", "1")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header = s.headers.Clone()

	resp, err := s.client.Do(req)
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
		if item.Magnet == "" || item.Title == "" {
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
			Trackers:  append([]string(nil), s.trackers...),
			Seeders:   seedersPtr,
			Leechers:  leechersPtr,
			Size:      sizePtr,
			SizeLabel: sizeLabel,
			Uploaded:  uploadedPtr,
			Category:  category,
			Source:    s.ID(),
		})
	}

	return results, nil
}
