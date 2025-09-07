// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2017 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

package urlutil

import (
	"strings"
	"testing"
)

func TestSanitizeURL(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expectedURL string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "Valid HTTPS URL",
			input:       "https://www.example.com/path?query=value",
			expectedURL: "https://www.example.com/path?query=value",
			expectError: false,
		},
		{
			name:        "Valid HTTP URL",
			input:       "http://www.example.com/path",
			expectedURL: "http://www.example.com/path",
			expectError: false,
		},
		{
			name:        "Valid HTTPS URL with port",
			input:       "https://www.example.com:8080/path",
			expectedURL: "https://www.example.com:8080/path",
			expectError: false,
		},
		{
			name:        "Valid HTTP URL with port",
			input:       "http://www.example.com:80/path",
			expectedURL: "http://www.example.com/path",
			expectError: false,
		},
		{
			name:        "Valid URL with fragment",
			input:       "https://www.example.com/path#fragment",
			expectedURL: "https://www.example.com/path#fragment",
			expectError: false,
		},
		{
			name:        "Valid URL with newlines (should be removed)",
			input:       "https://www.example.com/path\n\r",
			expectedURL: "https://www.example.com/path",
			expectError: false,
		},
		{
			name:        "Valid URL with carriage returns (should be removed)",
			input:       "https://www.example.com/path\r\n",
			expectedURL: "https://www.example.com/path",
			expectError: false,
		},
		{
			name:        "Empty URL",
			input:       "",
			expectedURL: "",
			expectError: true,
			errorMsg:    "missing URL to be shortened",
		},
		{
			name:        "Invalid URL format",
			input:       "not-a-url",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL is not absolute",
		},
		{
			name:        "Relative URL",
			input:       "/path/to/resource",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL is not absolute",
		},
		{
			name:        "URL with FTP scheme",
			input:       "ftp://ftp.example.com/file.txt",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: ftp",
		},
		{
			name:        "URL with file scheme",
			input:       "file:///path/to/file.txt",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: file",
		},
		{
			name:        "URL with javascript scheme",
			input:       "javascript:alert('xss')",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: javascript",
		},
		{
			name:        "URL with data scheme",
			input:       "data:text/html,<script>alert('xss')</script>",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: data",
		},
		{
			name:        "URL with mailto scheme",
			input:       "mailto:user@example.com",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: mailto",
		},
		{
			name:        "URL with tel scheme",
			input:       "tel:+1234567890",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: tel",
		},
		{
			name:        "URL with ssh scheme",
			input:       "ssh://user@example.com",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: ssh",
		},
		{
			name:        "URL with git scheme",
			input:       "git://github.com/user/repo.git",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: git",
		},
		{
			name:        "URL with ws scheme",
			input:       "ws://example.com/websocket",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: ws",
		},
		{
			name:        "URL with wss scheme",
			input:       "wss://example.com/websocket",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL scheme must be http or https, got: wss",
		},
		{
			name:        "URL with empty scheme",
			input:       "://www.example.com",
			expectedURL: "",
			expectError: true,
			errorMsg:    "URL cannot be parsed: parse \"://www.example.com\": missing protocol scheme",
		},
		{
			name:        "URL with only scheme",
			input:       "https://",
			expectedURL: "https://",
			expectError: false,
		},
		{
			name:        "URL with special characters in path",
			input:       "https://www.example.com/path with spaces",
			expectedURL: "https://www.example.com/path%20with%20spaces",
			expectError: false,
		},
		{
			name:        "URL with query parameters",
			input:       "https://www.example.com/search?q=test&lang=en",
			expectedURL: "https://www.example.com/search?q=test&lang=en",
			expectError: false,
		},
		{
			name:        "URL with user info",
			input:       "https://user:pass@www.example.com/path",
			expectedURL: "https://user:pass@www.example.com/path",
			expectError: false,
		},
		{
			name:        "URL with IPv4 address",
			input:       "https://192.168.1.1:8080/path",
			expectedURL: "https://192.168.1.1:8080/path",
			expectError: false,
		},
		{
			name:        "URL with IPv6 address",
			input:       "https://[2001:db8::1]:8080/path",
			expectedURL: "https://[2001:db8::1]:8080/path",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := SanitizeURL(tt.input)

			if tt.expectError {
				if err == nil {
					t.Errorf("SanitizeURL() expected error but got none")
					return
				}
				if tt.errorMsg != "" && err.Error() != tt.errorMsg {
					t.Errorf("SanitizeURL() error = %v, want %v", err.Error(), tt.errorMsg)
				}
			} else {
				if err != nil {
					t.Errorf("SanitizeURL() unexpected error = %v", err)
					return
				}
				if result != tt.expectedURL {
					t.Errorf("SanitizeURL() = %v, want %v", result, tt.expectedURL)
				}
			}
		})
	}
}

func TestSanitizeURL_EdgeCases(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expectError bool
	}{
		{
			name:        "URL with only whitespace",
			input:       "   ",
			expectError: true,
		},
		{
			name:        "URL with mixed newlines and carriage returns",
			input:       "https://www.example.com\n\r\n\r",
			expectError: false,
		},
		{
			name:        "URL with tab characters",
			input:       "https://www.example.com\t",
			expectError: false,
		},
		{
			name:        "URL with very long path",
			input:       "https://www.example.com/" + strings.Repeat("a", 100),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := SanitizeURL(tt.input)

			if tt.expectError && err == nil {
				t.Errorf("SanitizeURL() expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("SanitizeURL() unexpected error = %v", err)
			}
		})
	}
}
