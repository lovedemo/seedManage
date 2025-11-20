package utils

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/seedmanage/backend/internal/models"
)

// ParseMagnetLink 解析磁力链接并提取信息
func ParseMagnetLink(raw string) (models.SearchResult, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return models.SearchResult{}, fmt.Errorf("无效的磁力链接: %w", err)
	}
	if u.Scheme != "magnet" {
		return models.SearchResult{}, fmt.Errorf("仅支持磁力链接")
	}

	params := u.Query()
	title := Coalesce(decodeLabel(params.Get("dn")), "磁力链接")
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

	return models.SearchResult{
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

// BuildMagnetLink 根据 info hash、标题和 tracker 列表构建磁力链接
func BuildMagnetLink(infoHash, title string, trackers []string) string {
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

// decodeLabel 解码 URL 编码的标签
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

