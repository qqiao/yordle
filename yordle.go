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
	"context"
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"log"
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

const initDataTemplate = `
<script>
	window.__PRELOADED_STATE__ = %s;
	window.process = { env: { NODE_ENV: '%s' } };
</script>
`

func preloadedState(ctx context.Context) <-chan string {
	output := make(chan string)

	go func() {
		defer close(output)

		str, err := json.Marshal(map[string]interface{}{
			"languages": config.Locales,
		})

		if nil != err {
			log.Printf("Unable to marshall preloaded state. Error: %v",
				err)
		}
		output <- string(str)
	}()

	return output
}

func landingPage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := r.URL.Path[1:]
	idStr = strings.Replace(idStr, "\n", "", -1)
	idStr = strings.Replace(idStr, "\r", "", -1)

	// When we don't have an idStr or it contains any path elements, we would
	// serve the landing page
	if len(idStr) < 1 || strings.Contains(idStr, "/") ||
		strings.HasSuffix(idStr, "index.html") {
		dcCh := config.MustGetAsync(ctx)
		psCh := preloadedState(ctx)

		nodeEnv := "production"

		if runtime.IsDev {
			nodeEnv = "development"
		}

		initData := fmt.Sprintf(initDataTemplate, <-psCh, nodeEnv)

		tmpl := webapp.GetTemplate("index.html", runtime.IsDev)
		tmpl.Execute(w, map[string]interface{}{
			"Config":    <-dcCh,
			"BuildInfo": runtime.BuildInfo,
			"InitData":  template.HTML(initData),
		})
		return
	}

	id := base62.Decode(idStr)

	idStr = html.EscapeString(idStr)

	shortURL, err := shorturl.ByID(ctx, id)
	if err == datastore.ErrNoSuchEntity {
		log.Printf("Unable to load short url %s. Decoded key: %d",
			idStr, id)
		http.Error(w, fmt.Sprintf("Short URL %s cannot be found !!11one",
			idStr), http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error loading short URL '%s': %s", idStr,
			err.Error())
		http.Error(w, "Internal Server Error",
			http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, shortURL.OriginalURL, http.StatusMovedPermanently)
}

func version(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	if err := json.NewEncoder(w).Encode(runtime.BuildInfo); nil != err {
		log.Printf("Error marshalling build info. Error: %s", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Printf("Defaulting to port %s", port)
	}

	log.Printf("Listening on port %s", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))
}
