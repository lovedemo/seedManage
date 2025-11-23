package adapters

import (
	"testing"
)

func TestParseSizeString(t *testing.T) {
	tests := []struct {
		input    string
		expected int64
	}{
		{"2.0 GiB", 2147483648},
		{"704.9 MiB", 739098624},
		{"1.0 GiB", 1073741824},
		{"142.8 MiB", 149796249},
		{"63.5 GiB", 68182605824},
		{"16.1 GiB", 17289969664},
		{"42.2 GiB", 45302767411},
		{"", 0},
		{"invalid", 0},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseSizeString(tt.input)
			if result != tt.expected {
				t.Errorf("parseSizeString(%q) = %d, want %d", tt.input, result, tt.expected)
			}
		})
	}
}

func TestExtractInfoHashFromMagnet(t *testing.T) {
	tests := []struct {
		name     string
		magnet   string
		expected string
	}{
		{
			name:     "valid magnet with btih",
			magnet:   "magnet:?xt=urn:btih:f257af31a6204cd734d2baecb8331637850b7b44&dn=test",
			expected: "F257AF31A6204CD734D2BAECB8331637850B7B44",
		},
		{
			name:     "empty string",
			magnet:   "",
			expected: "",
		},
		{
			name:     "invalid format",
			magnet:   "not a magnet",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractInfoHashFromMagnet(tt.magnet)
			if result != tt.expected {
				t.Errorf("extractInfoHashFromMagnet(%q) = %q, want %q", tt.magnet, result, tt.expected)
			}
		})
	}
}
