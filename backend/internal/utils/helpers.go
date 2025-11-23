package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FormatSize 将字节数格式化为人类可读的大小
func FormatSize(bytes int64) string {
	if bytes <= 0 {
		return ""
	}
	units := []string{"B", "KB", "MB", "GB", "TB", "PB"}
	value := float64(bytes)
	idx := 0
	for value >= 1024 && idx < len(units)-1 {
		value /= 1024
		idx++
	}
	precision := 0
	if value < 10 && idx > 0 {
		precision = 1
	}
	return fmt.Sprintf("%.*f %s", precision, value, units[idx])
}

// PtrInt 返回 int 的指针
func PtrInt(v int) *int { return &v }

// PtrInt64 返回 int64 的指针
func PtrInt64(v int64) *int64 { return &v }

// Coalesce 返回第一个非空字符串
func Coalesce(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// Getenv 获取环境变量，如果为空则返回默认值
func Getenv(key, defaultValue string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return defaultValue
}

// ResolvePath 尝试在当前或上级目录解析相对路径
func ResolvePath(path string) string {
	cleaned := strings.TrimSpace(path)
	if cleaned == "" || filepath.IsAbs(cleaned) {
		return cleaned
	}

	if _, err := os.Stat(cleaned); err == nil {
		return cleaned
	}

	dir := filepath.Dir(cleaned)
	if dir != "." {
		if _, err := os.Stat(dir); err == nil {
			return cleaned
		}
	}

	alt := filepath.Join("..", cleaned)
	if _, err := os.Stat(alt); err == nil {
		return alt
	}

	altDir := filepath.Dir(alt)
	if altDir != "." {
		if _, err := os.Stat(altDir); err == nil {
			return alt
		}
	}

	return cleaned
}
