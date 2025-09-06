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

// Package yordle is URL shortener that is designed to work on the Google App
// Engine platform.
package main // import "github.com/qqiao/yordle"

import (
	"encoding/json"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/datastore"

	base62 "github.com/jcoene/go-base62"

	"github.com/qqiao/webapp"
	_ "github.com/qqiao/yordle/admin" // admin UI
	_ "github.com/qqiao/yordle/api"   // api stuff
	"github.com/qqiao/yordle/config"
	"github.com/qqiao/yordle/runtime"
	"github.com/qqiao/yordle/shorturl"
)

func landingPage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := r.URL.Path[1:]
	idStr = strings.ReplaceAll(idStr, "\n", "")
	idStr = strings.ReplaceAll(idStr, "\r", "")

	// When we don't have an idStr or it contains any path elements, we would
	// serve the landing page
	if len(idStr) < 1 || strings.Contains(idStr, "/") ||
		strings.HasSuffix(idStr, "index.html") {
		dcCh := config.MustGetAsync(ctx)

		tmpl := webapp.GetTemplate("index.html", runtime.IsDev)
		tmpl.Execute(w, map[string]interface{}{
			"Config":    <-dcCh,
			"BuildInfo": runtime.BuildInfo,
		})
		return
	}

	id := base62.Decode(idStr)

	idStr = html.EscapeString(idStr)

	shortURL, err := shorturl.ByID(ctx, id)
	if err == datastore.ErrNoSuchEntity {
		slog.Warn("Unable to load short url", "id", idStr, "decoded_key", id)
		http.Error(w, fmt.Sprintf("Short URL %s cannot be found !!11one",
			idStr), http.StatusNotFound)
		return
	} else if err != nil {
		slog.Error("Error loading short URL", "id", idStr, "error", err.Error())
		http.Error(w, "Internal Server Error",
			http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, shortURL.OriginalURL, http.StatusMovedPermanently)
}

func version(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	if err := json.NewEncoder(w).Encode(runtime.BuildInfo); nil != err {
		slog.Error("Error marshalling build info", "error", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		slog.Info("Defaulting to port", "port", port)
	}

	slog.Info("Listening on port", "port", port)
	slog.Error("Server failed", "error", http.ListenAndServe(fmt.Sprintf(":%s", port), nil))
}
