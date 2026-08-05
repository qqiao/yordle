// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2026 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

package runtime

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/qqiao/buildinfo"
)

func TestLoadBuildInfoLoadsValidMetadata(t *testing.T) {
	previous := BuildInfo
	t.Cleanup(func() { BuildInfo = previous })

	path := filepath.Join(t.TempDir(), "build_info.json")
	if err := os.WriteFile(path, []byte(`{"buildTime":123,"revision":"abc123"}`), 0o600); err != nil {
		t.Fatalf("write build metadata: %v", err)
	}

	if err := LoadBuildInfo(path); err != nil {
		t.Fatalf("LoadBuildInfo() returned an error: %v", err)
	}
	if BuildInfo == nil || BuildInfo.BuildTime != 123 || BuildInfo.Revision != "abc123" {
		t.Fatalf("BuildInfo = %+v, want loaded metadata", BuildInfo)
	}
}

func TestLoadBuildInfoReturnsMissingFileError(t *testing.T) {
	previous := BuildInfo
	BuildInfo = &buildinfo.BuildInfo{Revision: "unchanged"}
	t.Cleanup(func() { BuildInfo = previous })

	if err := LoadBuildInfo(filepath.Join(t.TempDir(), "missing.json")); err == nil {
		t.Fatal("LoadBuildInfo() returned nil for a missing file")
	}
	if BuildInfo.Revision != "unchanged" {
		t.Fatalf("BuildInfo changed after a load failure: %+v", BuildInfo)
	}
}

func TestLoadBuildInfoReturnsMalformedJSONError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "build_info.json")
	if err := os.WriteFile(path, []byte(`{"buildTime":`), 0o600); err != nil {
		t.Fatalf("write build metadata: %v", err)
	}

	if err := LoadBuildInfo(path); err == nil {
		t.Fatal("LoadBuildInfo() returned nil for malformed JSON")
	}
}
