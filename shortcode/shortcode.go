// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2026 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

// Package shortcode encodes and decodes datastore IDs for short URLs.
package shortcode

import (
	"errors"
	"math"
	"strings"
)

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

var (
	// ErrInvalidID indicates that an ID cannot identify a persisted entity.
	ErrInvalidID = errors.New("short URL ID must be positive")
	// ErrInvalidCode indicates that a short code is empty, malformed, or too large.
	ErrInvalidCode = errors.New("invalid short URL code")
)

// Encode converts a positive datastore ID to its base62 short code.
func Encode(id int64) (string, error) {
	if id <= 0 {
		return "", ErrInvalidID
	}

	var reversed [11]byte
	index := len(reversed)
	for id > 0 {
		index--
		reversed[index] = alphabet[id%int64(len(alphabet))]
		id /= int64(len(alphabet))
	}

	return string(reversed[index:]), nil
}

// Decode converts a base62 short code to a positive datastore ID.
func Decode(code string) (int64, error) {
	if code == "" {
		return 0, ErrInvalidCode
	}

	var id int64
	for _, character := range []byte(code) {
		digit := strings.IndexByte(alphabet, character)
		if digit < 0 || id > (math.MaxInt64-int64(digit))/int64(len(alphabet)) {
			return 0, ErrInvalidCode
		}
		id = id*int64(len(alphabet)) + int64(digit)
	}
	if id <= 0 {
		return 0, ErrInvalidCode
	}

	return id, nil
}
