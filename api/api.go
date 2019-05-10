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
	"log"
	"net/http"
	"net/url"

	"github.com/qqiao/webapp"

	"github.com/PuerkitoBio/purell"
	"github.com/jcoene/go-base62"

	"github.com/qqiao/yordle/shorturl"
)

// Status represents the server execution status.
type Status string

// Response status
const (
	StatusFailure Status = "FAILURE"
	StatusSuccess Status = "SUCCESS"
)

func init() {
	http.HandleFunc("/v1/api/create", webapp.HSTSHandler(createV1))
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

	// The sequence of checks to ensure that the original URL makes sense.
	// 1. If it is given.
	if originalURLString == "" {
		w.Write(output(ctx, StatusFailure, "Missing URL to be shortened", callback))
		return
	}

	// 2. If the URL parses properly
	originalURL, err := url.Parse(originalURLString)
	if err != nil {
		w.Write(output(ctx, StatusFailure, "URL cannot be parsed", callback))
		return
	}

	// 3. If the URL is absolute
	if !originalURL.IsAbs() {
		w.Write(output(ctx, StatusFailure, "URL is not absolute", callback))
		return
	}

	// 4. If the URL's domain is already the same as the current Yordle
	// instace, we just return the exact same URL
	if originalURL.Host == r.Host {
		w.Write(output(ctx, StatusSuccess, originalURLString, callback))
		return
	}

	// Now we normalize the URL so that we don't have to store duplicates
	originalURLString = purell.NormalizeURL(originalURL, purell.FlagsSafe)

	log.Printf("URL sanitized, attempting to persist...")

	shortURL, err := shorturl.Persist(ctx, originalURLString)
	if err != nil {
		log.Printf("Error persisting %s. Error: %s",
			originalURLString, err.Error())
		w.Write(output(ctx, StatusFailure, "Error Persisting URL", callback))
		return
	}

	log.Printf("Successfully created short url for '%s', ID: %d",
		originalURL, shortURL.ID)
	w.Write(output(ctx, StatusSuccess, fmt.Sprintf("https://%s/%s",
		r.Host, base62.Encode(shortURL.ID)), callback))
}

// Method to output the payload into the response writer. If the callback
// method is suplied, it will be outputting in JSONP format, otherwise it will
// be in JSON.
func output(ctx context.Context, status Status, payload interface{},
	callback string) (output []byte) {
	output, err := json.Marshal(map[string]interface{}{
		"status":  status,
		"payload": payload,
	})
	if err != nil {
		log.Printf("Unable to marshall JSON response, error: %s",
			err.Error())
		return []byte("")
	}

	if "" != callback {
		output = append([]byte(callback+"("), append(output, []byte(");")...)...)
	}
	return
}
