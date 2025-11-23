package history

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/seedmanage/backend/internal/models"
)

const (
	// DefaultHistoryLimit 是默认的历史记录条数上限
	DefaultHistoryLimit = 50
	// DefaultResultsPerEntry 是单条历史记录保存的最大结果数
	DefaultResultsPerEntry = 20
)

// Entry 表示一次搜索历史
type Entry struct {
	ID        string                `json:"id"`
	Query     string                `json:"query"`
	CreatedAt time.Time             `json:"createdAt"`
	Mode      string                `json:"mode"`
	Meta      models.SearchMeta     `json:"meta"`
	Results   []models.SearchResult `json:"results"`
}

// Store 基于文件的历史记录存储
type Store struct {
	path            string
	limit           int
	resultsPerEntry int
	mu              sync.Mutex
	entries         []Entry
}

// NewStore 创建文件存储实例
func NewStore(path string, limit, resultsPerEntry int) (*Store, error) {
	if limit <= 0 {
		limit = DefaultHistoryLimit
	}
	if resultsPerEntry <= 0 {
		resultsPerEntry = DefaultResultsPerEntry
	}

	store := &Store{
		path:            path,
		limit:           limit,
		resultsPerEntry: resultsPerEntry,
		entries:         []Entry{},
	}

	if err := store.load(); err != nil {
		return nil, err
	}

	return store, nil
}

// Record 保存一次搜索结果
func (s *Store) Record(response models.SearchResponse) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	limitedResults := cloneResults(response.Results, s.resultsPerEntry)

	entry := Entry{
		ID:        fmt.Sprintf("%d", now.UnixNano()),
		Query:     response.Query,
		CreatedAt: now,
		Mode:      response.Meta.Mode,
		Meta:      response.Meta,
		Results:   limitedResults,
	}
	entry.Meta.ResultCount = len(limitedResults)

	s.entries = append([]Entry{entry}, s.entries...)
	if len(s.entries) > s.limit {
		s.entries = append([]Entry{}, s.entries[:s.limit]...)
	}

	return s.persistLocked()
}

// List 返回历史记录副本，按时间倒序
func (s *Store) List() []Entry {
	s.mu.Lock()
	defer s.mu.Unlock()

	copied := make([]Entry, len(s.entries))
	for i, entry := range s.entries {
		copied[i] = cloneEntry(entry)
	}
	return copied
}

func (s *Store) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return s.persistLocked()
	}
	if err != nil {
		return fmt.Errorf("read history file: %w", err)
	}

	if len(data) == 0 {
		s.entries = []Entry{}
		return nil
	}

	var entries []Entry
	if err := json.Unmarshal(data, &entries); err != nil {
		return fmt.Errorf("parse history file: %w", err)
	}

	if entries == nil {
		entries = []Entry{}
	}

	if len(entries) > s.limit {
		entries = append([]Entry{}, entries[:s.limit]...)
	}

	s.entries = entries
	return nil
}

func (s *Store) persistLocked() error {
	entries := s.entries
	if entries == nil {
		entries = []Entry{}
	}

	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return fmt.Errorf("encode history file: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return fmt.Errorf("ensure history dir: %w", err)
	}

	tmpPath := s.path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o644); err != nil {
		return fmt.Errorf("write history file: %w", err)
	}

	if err := os.Rename(tmpPath, s.path); err != nil {
		return fmt.Errorf("replace history file: %w", err)
	}

	return nil
}

func cloneEntry(entry Entry) Entry {
	cloned := entry
	cloned.Results = cloneResults(entry.Results, len(entry.Results))
	return cloned
}

func cloneResults(results []models.SearchResult, limit int) []models.SearchResult {
	if len(results) == 0 || limit == 0 {
		return []models.SearchResult{}
	}

	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	cloned := make([]models.SearchResult, len(results))
	for i, result := range results {
		cloned[i] = result
		if len(result.Trackers) > 0 {
			cloned[i].Trackers = append([]string{}, result.Trackers...)
		}
	}
	return cloned
}
