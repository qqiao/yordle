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

// +build local

package main

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/qqiao/webapp"

	"github.com/qqiao/yordle/config"
)

var staticFileExtensions = []string{
	".ico",
	".jpeg",
	".jpg",
	".json",
	".js",
	".map",
	".png",
}

var fileServers = map[string]http.Handler{}

func init() {
	http.HandleFunc("/", webapp.HSTSHandler(localIndex))

	for _, locale := range config.Locales {
		fileServers[locale] = http.FileServer(http.Dir(filepath.Join(".", locale)))
	}
}

func localIndex(w http.ResponseWriter, r *http.Request) {
	locale := webapp.DetermineLocale(r.Header.Get("accept-language"),
	config.Locales)

	fileServer := fileServers[locale]

	for _, ext := range staticFileExtensions {
		if strings.HasSuffix(r.URL.Path, ext) {
			fileServer.ServeHTTP(w, r)
			return
		}
	}
	landingPage(w, r)
}
