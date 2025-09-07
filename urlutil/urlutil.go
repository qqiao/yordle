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
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/purell"
)

// SanitizeURL validates and sanitizes a URL to ensure it's a valid HTTP or HTTPS URL.
// It returns the sanitized URL and any validation error.
func SanitizeURL(urlString string) (string, error) {
	// Check if URL is provided
	if urlString == "" {
		return "", fmt.Errorf("missing URL to be shortened")
	}

	// Clean the URL string first by removing control characters
	cleanedURL := strings.Replace(urlString, "\n", "", -1)
	cleanedURL = strings.Replace(cleanedURL, "\r", "", -1)
	cleanedURL = strings.Replace(cleanedURL, "\t", "", -1)
	cleanedURL = strings.TrimSpace(cleanedURL)

	// Check if URL is empty after cleaning
	if cleanedURL == "" {
		return "", fmt.Errorf("URL is empty after cleaning")
	}

	// Parse the URL
	parsedURL, err := url.Parse(cleanedURL)
	if err != nil {
		return "", fmt.Errorf("URL cannot be parsed: %w", err)
	}

	// Check if the URL is absolute
	if !parsedURL.IsAbs() {
		return "", fmt.Errorf("URL is not absolute")
	}

	// Check if the URL scheme is HTTP or HTTPS
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return "", fmt.Errorf("URL scheme must be http or https, got: %s", parsedURL.Scheme)
	}

	// Normalize the URL using purell
	normalizedURL := purell.NormalizeURL(parsedURL, purell.FlagsSafe)

	return normalizedURL, nil
}
