package adapters

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"

	"github.com/seedmanage/backend/internal/models"
	"github.com/seedmanage/backend/internal/utils"
)

// HTMLSukebei 实现通过解析 sukebei.nyaa.si 的 HTML 页面进行搜索的适配器
type HTMLSukebei struct {
	endpoint string
	headers  http.Header
	client   *http.Client
	trackers []string
}

// NewHTMLSukebei 创建一个新的 HTMLSukebei 适配器
func NewHTMLSukebei(endpoint string, trackers []string) models.Adapter {
	return &HTMLSukebei{
		endpoint: strings.TrimRight(endpoint, "/"),
		headers: http.Header{
			"User-Agent": []string{"magnetsearch-backend/1.0"},
		},
		client:   &http.Client{Timeout: 15 * time.Second},
		trackers: append([]string(nil), trackers...),
	}
}

func (h *HTMLSukebei) ID() string          { return "htmlsukebei" }
func (h *HTMLSukebei) Name() string        { return "HTML Sukebei" }
func (h *HTMLSukebei) Description() string { return "通过解析 sukebei.nyaa.si 的 HTML 页面检索资源" }
func (h *HTMLSukebei) Endpoint() string    { return h.endpoint }

// Search 执行搜索
func (h *HTMLSukebei) Search(ctx context.Context, term string) ([]models.SearchResult, error) {
	return h.SearchWithOptions(ctx, models.SearchOptions{Query: term, Page: 1})
}

// SearchWithOptions 执行搜索，支持分页
func (h *HTMLSukebei) SearchWithOptions(ctx context.Context, options models.SearchOptions) ([]models.SearchResult, error) {
	u, err := url.Parse(h.endpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid htmlsukebei endpoint: %w", err)
	}

	q := u.Query()
	q.Set("f", "0")
	q.Set("c", "0_0")
	q.Set("q", options.Query)
	q.Set("p", strconv.Itoa(options.Page))
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header = h.headers.Clone()

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, fmt.Errorf("remote service error: %s - %s", resp.Status, string(body))
	}

	return parseHTMLSukebei(resp.Body, h.trackers, h.ID())
}

// parseHTMLSukebei 解析 sukebei.nyaa.si 的 HTML 表格并提取结果
func parseHTMLSukebei(r io.Reader, trackers []string, sourceID string) ([]models.SearchResult, error) {
	z := html.NewTokenizer(r)

	type rowState int
	const (
		searchTable rowState = iota
		inTable
		inRow
		inCell
	)

	state := searchTable
	cellIndex := -1
	depth := 0

	var results []models.SearchResult
	var current models.SearchResult
	var textBuf strings.Builder
	var magnetHref string
	var categoryName string
	var titleAttr string
	var timestampStr string

	// Reset current row
	resetRow := func() {
		current = models.SearchResult{}
		cellIndex = -1
		magnetHref = ""
		categoryName = ""
		titleAttr = ""
		timestampStr = ""
	}

	resetRow()

	for {
		tt := z.Next()
		switch tt {
		case html.ErrorToken:
			if err := z.Err(); err == io.EOF {
				return results, nil
			}
			return results, z.Err()

		case html.StartTagToken, html.SelfClosingTagToken:
			nameBytes, hasAttr := z.TagName()
			tagName := string(nameBytes)

			switch state {
			case searchTable:
				if tagName == "table" && hasClassAttr(z, "torrent-list") {
					state = inTable
					depth = 1
				}

			case inTable:
				switch tagName {
				case "table":
					depth++
				case "tr":
					if hasClassAttr(z, "default") {
						state = inRow
						resetRow()
					}
				}

			case inRow:
				switch tagName {
				case "td":
					state = inCell
					cellIndex++
					textBuf.Reset()
					magnetHref = ""
					categoryName = ""
					titleAttr = ""
					timestampStr = ""

					// Check for data-timestamp attribute (cell index 4 = date column)
					if hasAttr {
						for {
							key, val, more := z.TagAttr()
							if string(key) == "data-timestamp" {
								timestampStr = string(val)
							}
							if !more {
								break
							}
						}
					}

				case "a":
					for {
						key, val, more := z.TagAttr()
						if string(key) == "href" {
							href := string(val)
							if strings.HasPrefix(href, "magnet:") {
								magnetHref = href
							}
						}
						if string(key) == "title" {
							titleAttr = string(val)
						}
						if !more {
							break
						}
					}

				case "img":
					if cellIndex == 0 {
						for {
							key, val, more := z.TagAttr()
							if string(key) == "alt" {
								categoryName = string(val)
							}
							if !more {
								break
							}
						}
					}
				}

			case inCell:
				switch tagName {
				case "a":
					for {
						key, val, more := z.TagAttr()
						if string(key) == "href" {
							href := string(val)
							if strings.HasPrefix(href, "magnet:") {
								magnetHref = href
							}
						}
						if string(key) == "title" {
							titleAttr = string(val)
						}
						if !more {
							break
						}
					}
				case "img":
					if cellIndex == 0 {
						for {
							key, val, more := z.TagAttr()
							if string(key) == "alt" {
								categoryName = string(val)
							}
							if !more {
								break
							}
						}
					}
				}
			}

		case html.EndTagToken:
			nameBytes, _ := z.TagName()
			tagName := string(nameBytes)

			switch state {
			case inCell:
				if tagName == "td" {
					state = inRow
					text := strings.TrimSpace(textBuf.String())

					// Process the cell based on its index
					switch cellIndex {
					case 0: // Category
						if categoryName != "" {
							current.Category = categoryName
						}
					case 1: // Title
						if titleAttr != "" {
							current.Title = titleAttr
						}
					case 2: // Magnet link
						if magnetHref != "" {
							current.Magnet = magnetHref
							current.InfoHash = strings.ToUpper(extractInfoHashFromMagnet(magnetHref))
						}
					case 3: // Size
						if text != "" {
							current.SizeLabel = text
							if sizeBytes := parseSizeString(text); sizeBytes > 0 {
								current.Size = utils.PtrInt64(sizeBytes)
							}
						}
					case 4: // Date
						if text != "" {
							if ts, err := strconv.ParseInt(timestampStr, 10, 64); err == nil && ts > 0 {
								t := time.Unix(ts, 0).UTC()
								current.Uploaded = &t
							} else if t, err := time.Parse("2006-01-02 15:04", text); err == nil {
								current.Uploaded = &t
							}
						}
					case 5: // Seeders
						if text != "" {
							if seeders, err := strconv.Atoi(text); err == nil {
								current.Seeders = utils.PtrInt(seeders)
							}
						}
					case 6: // Leechers
						if text != "" {
							if leechers, err := strconv.Atoi(text); err == nil {
								current.Leechers = utils.PtrInt(leechers)
							}
						}
						// Cell 7 (Completed) is skipped
					}
				}

			case inRow:
				if tagName == "tr" {
					// Validate and add the row
					if current.Magnet != "" && current.Title != "" {
						if current.Category == "" {
							current.Category = "未知"
						}
						current.Trackers = append([]string(nil), trackers...)
						current.Source = sourceID
						results = append(results, current)
					}
					resetRow()
					state = inTable
				}

			case inTable:
				switch tagName {
				case "table":
					depth--
					if depth == 0 {
						return results, nil
					}
				}
			}

		case html.TextToken:
			text := strings.TrimSpace(string(z.Text()))
			if text == "" {
				continue
			}
			if state == inCell {
				textBuf.WriteString(text)
			}
		}
	}
}

// hasClassAttr checks if the current token has the given class in its class attribute
func hasClassAttr(z *html.Tokenizer, class string) bool {
	if z == nil {
		return false
	}
	for {
		key, val, more := z.TagAttr()
		if string(key) == "class" {
			classes := strings.Fields(string(val))
			for _, c := range classes {
				if c == class {
					return true
				}
			}
		}
		if !more {
			break
		}
	}
	return false
}