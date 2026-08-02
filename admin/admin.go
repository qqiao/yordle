// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2014 The Yordle Team
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

// Package admin provides UI endpoints for admin functionality of Yordle.
package admin

import (
	"bytes"
	"log/slog"
	"net/http"
	"path/filepath"

	"github.com/qqiao/webapp"
	"github.com/qqiao/yordle/api"
	"github.com/qqiao/yordle/config"
	"github.com/qqiao/yordle/runtime"
)

func init() {
	http.HandleFunc("/admin/", api.HSTSHandler(admin))
}

// Handler function for admin functionalities.
func admin(w http.ResponseWriter, r *http.Request) {
	if !runtime.IsDev && r.Header.Get("X-Appengine-User-Is-Admin") != "1" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	tmpl := webapp.GetTemplate(
		filepath.Clean(filepath.Join("admin.html")), runtime.IsDev)
	var output bytes.Buffer
	if err := tmpl.Execute(&output, map[string]interface{}{
		"Config": config.MustGet(r.Context()),
	}); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if _, err := output.WriteTo(w); err != nil {
		slog.Error("Unable to write admin response", "error", err)
	}
}
