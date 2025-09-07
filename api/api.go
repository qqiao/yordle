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
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/jcoene/go-base62"
	"github.com/qqiao/webapp"
	"github.com/qqiao/yordle/runtime"
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
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	originalURLString := r.PostFormValue("OriginalUrl")
	callback := r.PostFormValue("callback")

	if "" == callback {
		w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	} else {
		w.Header().Set("Content-Type", "application/javascript; charset=UTF-8")
	}

	// Sanitize and validate the URL
	sanitizedURL, err := urlutil.SanitizeURL(originalURLString)
	if err != nil {
		w.Write(output(ctx, StatusFailure, err.Error(), callback))
		return
	}

	// Parse the sanitized URL to check if it's the same as current host
	originalURL, err := url.Parse(sanitizedURL)
	if err != nil {
		w.Write(output(ctx, StatusFailure, "URL cannot be parsed after sanitization", callback))
		return
	}

	// If the URL's domain is already the same as the current Yordle
	// instance, we just return the exact same URL
	if originalURL.Host == r.Host {
		w.Write(output(ctx, StatusSuccess, sanitizedURL, callback))
		return
	}

	originalURLString = sanitizedURL
	slog.Info("URL sanitized, attempting to persist...")

	shortURL, err := shorturl.Persist(ctx, originalURLString)
	if err != nil {
		slog.Error("Error persisting URL", "url", originalURLString, "error", err.Error())
		w.Write(output(ctx, StatusFailure, "Error Persisting URL", callback))
		return
	}

	slog.Info("Successfully created short url", "url", originalURLString, "id", shortURL.ID)
	w.Write(output(ctx, StatusSuccess, fmt.Sprintf("https://%s/%s",
		r.Host, base62.Encode(shortURL.ID)), callback))
}

// Method to output the payload into the response writer. If the callback
// method is suplied, it will be outputting in JSONP format, otherwise it will
// be in JSON.
func output(_ context.Context, status Status, payload interface{},
	callback string) (output []byte) {
	output, err := json.Marshal(map[string]interface{}{
		"status":  status,
		"payload": payload,
	})
	if err != nil {
		slog.Error("Unable to marshall JSON response", "error", err.Error())
		return []byte("")
	}

	if "" != callback {
		output = append([]byte(callback+"("), append(output, []byte(");")...)...)
	}
	return
}
