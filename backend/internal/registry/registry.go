package registry

import (
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/seedmanage/backend/internal/models"
)

// AdapterRegistry 管理所有已注册的适配器
type AdapterRegistry struct {
	mu         sync.RWMutex
	adapters   map[string]models.Adapter
	defaultID  string
	fallbackID string
}

// New 创建一个新的适配器注册器
func New() *AdapterRegistry {
	return &AdapterRegistry{
		adapters: make(map[string]models.Adapter),
	}
}

// Register 注册一个适配器
func (r *AdapterRegistry) Register(adapter models.Adapter) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.adapters[adapter.ID()] = adapter
}

// Configure 配置默认和备用适配器
func (r *AdapterRegistry) Configure(defaultID, fallbackID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.adapters) == 0 {
		return errors.New("no adapters registered")
	}

	if defaultID != "" {
		if _, ok := r.adapters[defaultID]; ok {
			r.defaultID = defaultID
		} else {
			return fmt.Errorf("default adapter %s not registered", defaultID)
		}
	}

	if r.defaultID == "" {
		for id := range r.adapters {
			r.defaultID = id
			break
		}
	}

	if fallbackID != "" && fallbackID != r.defaultID {
		if _, ok := r.adapters[fallbackID]; ok {
			r.fallbackID = fallbackID
		} else {
			return fmt.Errorf("fallback adapter %s not registered", fallbackID)
		}
	}

	return nil
}

// Get 获取指定 ID 的适配器
func (r *AdapterRegistry) Get(id string) (models.Adapter, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	adapter, ok := r.adapters[id]
	return adapter, ok
}

// Default 获取默认适配器
func (r *AdapterRegistry) Default() (models.Adapter, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.defaultID == "" {
		return nil, false
	}
	adapter, ok := r.adapters[r.defaultID]
	return adapter, ok
}

// DefaultID 返回默认适配器的 ID
func (r *AdapterRegistry) DefaultID() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.defaultID
}

// Fallback 获取备用适配器（排除指定 ID）
func (r *AdapterRegistry) Fallback(excludeID string) (models.Adapter, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.fallbackID == "" || r.fallbackID == excludeID {
		return nil, false
	}
	adapter, ok := r.adapters[r.fallbackID]
	return adapter, ok
}

// List 返回所有适配器的信息列表
func (r *AdapterRegistry) List() []models.AdapterInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	infos := make([]models.AdapterInfo, 0, len(r.adapters))
	for id, adapter := range r.adapters {
		infos = append(infos, models.AdapterInfo{
			ID:          id,
			Name:        adapter.Name(),
			Description: adapter.Description(),
			Endpoint:    adapter.Endpoint(),
			Default:     id == r.defaultID,
			Fallback:    id == r.fallbackID,
		})
	}

	sort.Slice(infos, func(i, j int) bool {
		if infos[i].Default {
			return true
		}
		if infos[j].Default {
			return false
		}
		return infos[i].ID < infos[j].ID
	})

	return infos
}

