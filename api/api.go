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

// Package api provides RESTful API for CRUD operations of short URLs.
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"net/http"
	"net/url"

	"github.com/qqiao/webapp"
	"github.com/qqiao/yordle/runtime"
	"github.com/qqiao/yordle/shortcode"
	"github.com/qqiao/yordle/shorturl"
	"github.com/qqiao/yordle/urlutil"
)

// Status represents the server execution status.
type Status string

// Response status
const (
	StatusFailure Status = "FAILURE"
	StatusSuccess Status = "SUCCESS"
)

const (
	maxCreateBodyBytes  = 256 * 1024
	maxOriginalURLBytes = 64 * 1024
)

type response struct {
	Status  Status `json:"status"`
	Payload string `json:"payload"`
}

func init() {
	http.HandleFunc("/v1/api/create", HSTSHandler(createV1))
	http.HandleFunc("/api/v1/create", HSTSHandler(createV1))
}

func HSTSHandler(f http.HandlerFunc) http.HandlerFunc {
	if runtime.IsDev {
		return f
	}

	return webapp.HSTSHandler(f)
}

// Handler function for creating new short URL.
func createV1(w http.ResponseWriter, r *http.Request) {
	// We only allow POST requests because of the fact that URLs can be way too
	// long for gets. Thus for anything that's not POST, we error out.
	if "POST" != r.Method {
		w.Header().Set("Allow", http.MethodPost)
		writeResponse(w, http.StatusMethodNotAllowed, StatusFailure, "Method Not Allowed")
		return
	}

	ctx := r.Context()

	r.Body = http.MaxBytesReader(w, r.Body, maxCreateBodyBytes)
	parseErr := parseCreateForm(r)
	if r.MultipartForm != nil {
		defer func() {
			if err := r.MultipartForm.RemoveAll(); err != nil {
				slog.Warn("Unable to remove multipart form files", "error", err)
			}
		}()
	}
	if parseErr != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(parseErr, &maxBytesError) {
			writeResponse(w, http.StatusRequestEntityTooLarge, StatusFailure, "Request body is too large")
			return
		}

		writeResponse(w, http.StatusBadRequest, StatusFailure, "Invalid form data")
		return
	}

	originalURLString := r.PostForm.Get("OriginalUrl")
	if len(originalURLString) > maxOriginalURLBytes {
		writeResponse(w, http.StatusRequestEntityTooLarge, StatusFailure, "URL is too long")
		return
	}

	// Sanitize and validate the URL
	sanitizedURL, err := urlutil.SanitizeURL(originalURLString)
	if err != nil {
		writeResponse(w, http.StatusBadRequest, StatusFailure, err.Error())
		return
	}

	// Parse the sanitized URL to check if it's the same as current host
	originalURL, err := url.Parse(sanitizedURL)
	if err != nil {
		slog.Error("Unable to parse sanitized URL", "error", err)
		writeResponse(w, http.StatusInternalServerError, StatusFailure, "Internal Server Error")
		return
	}

	// If the URL's domain is already the same as the current Yordle
	// instance, we just return the exact same URL
	if originalURL.Host == r.Host {
		writeResponse(w, http.StatusOK, StatusSuccess, sanitizedURL)
		return
	}

	originalURLString = sanitizedURL
	slog.Info("URL sanitized, attempting to persist...")

	shortURL, err := shorturl.Persist(ctx, originalURLString)
	if err != nil {
		slog.Error("Error persisting URL", "error", err.Error())
		writeResponse(w, http.StatusInternalServerError, StatusFailure, "Error Persisting URL")
		return
	}

	code, err := shortcode.Encode(shortURL.ID)
	if err != nil {
		slog.Error("Unable to encode short URL ID", "id", shortURL.ID, "error", err)
		writeResponse(w, http.StatusInternalServerError, StatusFailure, "Error Persisting URL")
		return
	}

	slog.Info("Successfully created short URL", "id", shortURL.ID)
	writeResponse(w, http.StatusOK, StatusSuccess, formatShortURL(r.Host, code, runtime.IsDev))
}

func parseCreateForm(r *http.Request) error {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil {
		return fmt.Errorf("parse content type: %w", err)
	}

	switch mediaType {
	case "application/x-www-form-urlencoded":
		return r.ParseForm()
	case "multipart/form-data":
		return r.ParseMultipartForm(maxCreateBodyBytes)
	default:
		return fmt.Errorf("unsupported content type %q", mediaType)
	}
}

func formatShortURL(host, code string, development bool) string {
	scheme := "https"
	if development {
		scheme = "http"
	}
	return fmt.Sprintf("%s://%s/%s", scheme, host, code)
}

func writeResponse(w http.ResponseWriter, statusCode int, status Status, payload string) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(response{Status: status, Payload: payload}); err != nil {
		slog.Error("Unable to write JSON response", "error", err)
	}
}
