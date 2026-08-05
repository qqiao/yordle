// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2026 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestCreateAPIAlwaysReturnsJSON(t *testing.T) {
	form := url.Values{
		"OriginalUrl": {"https://example.com/already-short"},
		"callback":    {"handleResponse"},
	}
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/v1/api/create",
		strings.NewReader(form.Encode()),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response := httptest.NewRecorder()

	http.DefaultServeMux.ServeHTTP(response, request)

	if got := response.Header().Get("Content-Type"); got != "application/json; charset=UTF-8" {
		t.Fatalf("Content-Type = %q, want JSON", got)
	}

	var body struct {
		Status  string `json:"status"`
		Payload string `json:"payload"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not valid JSON: %v", err)
	}
	if body.Status != "SUCCESS" || body.Payload != "https://example.com/already-short" {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestLandingPageRejectsMalformedShortCodes(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "https://example.com/1-", nil)
	response := httptest.NewRecorder()

	landingPage(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotFound)
	}
}

func TestAdminRejectsUnauthenticatedRequests(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "https://example.com/admin/", nil)
	response := httptest.NewRecorder()

	http.DefaultServeMux.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
}

func TestAdminRendersForAppEngineAdmin(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "https://example.com/admin/", nil)
	request.Header.Set("X-Appengine-User-Is-Admin", "1")
	response := httptest.NewRecorder()

	http.DefaultServeMux.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if !strings.Contains(response.Body.String(), "<yordle-admin") {
		t.Fatalf("admin response does not contain the admin component")
	}
}
