// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2026 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

package api

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

type testResponse struct {
	Status  Status `json:"status"`
	Payload string `json:"payload"`
}

func TestCreateV1RejectsUnsupportedMethodsWithJSON(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "https://example.com/api/v1/create", nil)
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusMethodNotAllowed)
	}
	if got := response.Header().Get("Allow"); got != http.MethodPost {
		t.Fatalf("Allow = %q, want %q", got, http.MethodPost)
	}
	assertFailureResponse(t, response)
}

func TestCreateV1RejectsMalformedFormData(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		strings.NewReader("OriginalUrl=%zz"),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
	}
	assertFailureResponse(t, response)
}

func TestCreateV1RejectsInvalidURLs(t *testing.T) {
	form := url.Values{"OriginalUrl": {"javascript:alert(1)"}}
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		strings.NewReader(form.Encode()),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
	}
	assertFailureResponse(t, response)
}

func TestCreateV1RejectsOversizedURLs(t *testing.T) {
	oversizedURL := "https://example.com/" + strings.Repeat("a", 64*1024)
	form := url.Values{"OriginalUrl": {oversizedURL}}
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		strings.NewReader(form.Encode()),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusRequestEntityTooLarge)
	}
	assertFailureResponse(t, response)
}

func TestCreateV1RejectsOversizedRequestBodies(t *testing.T) {
	body := "OriginalUrl=https%3A%2F%2Fexample.com%2Fx&padding=" + strings.Repeat("a", 512*1024)
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		strings.NewReader(body),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusRequestEntityTooLarge)
	}
	assertFailureResponse(t, response)
}

func TestCreateV1ReturnsSameHostURLs(t *testing.T) {
	form := url.Values{"OriginalUrl": {"https://example.com/already-short"}}
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		strings.NewReader(form.Encode()),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	body := decodeResponse(t, response)
	if body.Status != StatusSuccess || body.Payload != "https://example.com/already-short" {
		t.Fatalf("response = %+v, want the original URL", body)
	}
}

func TestCreateV1ReturnsServerErrorWhenPersistenceFails(t *testing.T) {
	form := url.Values{"OriginalUrl": {"https://external.example/long"}}
	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		strings.NewReader(form.Encode()),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	canceledContext, cancel := context.WithCancel(request.Context())
	cancel()
	request = request.WithContext(canceledContext)
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	assertFailureResponse(t, response)
}

func TestCreateV1AcceptsMultipartFormDataFromBrowsers(t *testing.T) {
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	if err := form.WriteField("OriginalUrl", "https://example.com/already-short"); err != nil {
		t.Fatalf("write form field: %v", err)
	}
	if err := form.Close(); err != nil {
		t.Fatalf("close form: %v", err)
	}

	request := httptest.NewRequest(
		http.MethodPost,
		"https://example.com/api/v1/create",
		&body,
	)
	request.Header.Set("Content-Type", form.FormDataContentType())
	response := httptest.NewRecorder()

	createV1(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", response.Code, http.StatusOK, response.Body)
	}
	decoded := decodeResponse(t, response)
	if decoded.Status != StatusSuccess || decoded.Payload != "https://example.com/already-short" {
		t.Fatalf("response = %+v, want the original URL", decoded)
	}
}

func TestFormatShortURLUsesHTTPForLocalDevelopment(t *testing.T) {
	if got := formatShortURL("localhost:8080", "Ab1", true); got != "http://localhost:8080/Ab1" {
		t.Fatalf("formatShortURL() = %q, want local HTTP URL", got)
	}
}

func TestFormatShortURLUsesHTTPSInProduction(t *testing.T) {
	if got := formatShortURL("yordle.example", "Ab1", false); got != "https://yordle.example/Ab1" {
		t.Fatalf("formatShortURL() = %q, want production HTTPS URL", got)
	}
}

func assertFailureResponse(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()

	body := decodeResponse(t, response)
	if body.Status != StatusFailure || body.Payload == "" {
		t.Fatalf("response = %+v, want a failure with a message", body)
	}
}

func decodeResponse(t *testing.T, response *httptest.ResponseRecorder) testResponse {
	t.Helper()

	if got := response.Header().Get("Content-Type"); got != "application/json; charset=UTF-8" {
		t.Fatalf("Content-Type = %q, want JSON", got)
	}
	var body testResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not valid JSON: %v", err)
	}
	return body
}
