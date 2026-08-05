// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2026 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

package shortcode

import (
	"errors"
	"math"
	"testing"
)

func TestEncodePreservesExistingBase62Format(t *testing.T) {
	tests := []struct {
		id   int64
		want string
	}{
		{id: 1, want: "1"},
		{id: 61, want: "z"},
		{id: 62, want: "10"},
		{id: 3843, want: "zz"},
	}

	for _, test := range tests {
		got, err := Encode(test.id)
		if err != nil {
			t.Fatalf("Encode(%d) returned an error: %v", test.id, err)
		}
		if got != test.want {
			t.Errorf("Encode(%d) = %q, want %q", test.id, got, test.want)
		}
	}
}

func TestEncodeRejectsNonPositiveIDs(t *testing.T) {
	for _, id := range []int64{-1, 0} {
		if _, err := Encode(id); !errors.Is(err, ErrInvalidID) {
			t.Errorf("Encode(%d) error = %v, want ErrInvalidID", id, err)
		}
	}
}

func TestDecodeRejectsMalformedCodes(t *testing.T) {
	for _, code := range []string{"", "0", "1-", "hello!", "中"} {
		if _, err := Decode(code); !errors.Is(err, ErrInvalidCode) {
			t.Errorf("Decode(%q) error = %v, want ErrInvalidCode", code, err)
		}
	}
}

func TestDecodeRejectsOverflow(t *testing.T) {
	encodedMax, err := Encode(math.MaxInt64)
	if err != nil {
		t.Fatalf("Encode(MaxInt64) returned an error: %v", err)
	}

	if _, err := Decode("1" + encodedMax); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("Decode(overflow) error = %v, want ErrInvalidCode", err)
	}
}

func FuzzEncodeDecodeRoundTrip(f *testing.F) {
	for _, id := range []int64{1, 61, 62, 3843, math.MaxInt64} {
		f.Add(id)
	}

	f.Fuzz(func(t *testing.T, id int64) {
		if id <= 0 {
			t.Skip()
		}

		code, err := Encode(id)
		if err != nil {
			t.Fatalf("Encode(%d) returned an error: %v", id, err)
		}
		decoded, err := Decode(code)
		if err != nil {
			t.Fatalf("Decode(%q) returned an error: %v", code, err)
		}
		if decoded != id {
			t.Fatalf("Decode(Encode(%d)) = %d", id, decoded)
		}
	})
}
