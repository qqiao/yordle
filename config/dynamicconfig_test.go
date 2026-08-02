// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2026 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

package config

import (
	"context"
	"reflect"
	"testing"

	"cloud.google.com/go/datastore"
)

func deleteDynamicConfig(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	client, err := datastore.NewClient(ctx, ProjectName)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := client.Close(); err != nil {
			t.Errorf("closing datastore client: %v", err)
		}
	})

	key := datastore.NameKey(KindName, InstanceKey, nil)
	if err := client.Delete(ctx, key); err != nil {
		t.Fatal(err)
	}
}

func TestGetSeedsDefaultInstance(t *testing.T) {
	deleteDynamicConfig(t)

	ctx := context.Background()
	got, err := Get(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(*got, DefaultInstance) {
		t.Fatalf("Get() = %+v, want %+v", *got, DefaultInstance)
	}

	client, err := datastore.NewClient(ctx, ProjectName)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()

	var persisted DynamicConfig
	key := datastore.NameKey(KindName, InstanceKey, nil)
	if err := client.Get(ctx, key, &persisted); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(persisted, DefaultInstance) {
		t.Fatalf("persisted config = %+v, want %+v", persisted, DefaultInstance)
	}
}

func TestSavePersistsConfig(t *testing.T) {
	deleteDynamicConfig(t)

	ctx := context.Background()
	want := &DynamicConfig{
		AppName: "My Yordle",
		GoogleAnalytics: GoogleAnalyticsConfig{
			Enabled:    true,
			TrackingID: "test-tracking-id",
		},
	}
	if err := Save(ctx, want); err != nil {
		t.Fatal(err)
	}

	got, err := Get(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Get() = %+v, want %+v", got, want)
	}
}
