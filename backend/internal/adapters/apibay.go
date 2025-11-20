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

// APIBay 实现通过 apibay.org 进行搜索的适配器
type APIBay struct {
	endpoint string
	headers  http.Header
	client   *http.Client
	trackers []string
}

// NewAPIBay 创建一个新的 APIBay 适配器
func NewAPIBay(endpoint string, trackers []string) models.Adapter {
	return &APIBay{
		endpoint: endpoint,
		headers: http.Header{
			"User-Agent": []string{"magnetsearch-backend/1.0"},
		},
		client:   &http.Client{Timeout: 8 * time.Second},
		trackers: append([]string(nil), trackers...),
	}
}

func (a *APIBay) ID() string          { return "apibay" }
func (a *APIBay) Name() string        { return "The Pirate Bay (apibay.org)" }
func (a *APIBay) Description() string { return "通过 apibay.org 提供的公开 API 检索资源" }
func (a *APIBay) Endpoint() string    { return a.endpoint }

// Search 执行搜索
func (a *APIBay) Search(ctx context.Context, term string) ([]models.SearchResult, error) {
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

	results := make([]models.SearchResult, 0, len(payload))

	for _, item := range payload {
		if item.InfoHash == "" || item.Name == "" {
			continue
		}

		magnet := utils.BuildMagnetLink(item.InfoHash, item.Name, a.trackers)

		var seedersPtr *int
		if seeders, err := strconv.Atoi(item.Seeders); err == nil {
			seedersPtr = utils.PtrInt(seeders)
		}

		var leechersPtr *int
		if leechers, err := strconv.Atoi(item.Leechers); err == nil {
			leechersPtr = utils.PtrInt(leechers)
		}

		var sizePtr *int64
		var sizeLabel string
		if size, err := strconv.ParseInt(item.Size, 10, 64); err == nil && size > 0 {
			sizePtr = utils.PtrInt64(size)
			sizeLabel = utils.FormatSize(size)
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

		results = append(results, models.SearchResult{
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

