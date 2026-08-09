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
	"sync"

	"cloud.google.com/go/datastore"
)

var (
	datastoreClientMu sync.Mutex
	datastoreClient   *datastore.Client
)

// DatastoreClient returns the process-wide Datastore client. Datastore clients
// are safe for concurrent use and are intended to be reused across requests.
func DatastoreClient(ctx context.Context) (*datastore.Client, error) {
	datastoreClientMu.Lock()
	defer datastoreClientMu.Unlock()

	if datastoreClient != nil {
		return datastoreClient, nil
	}

	client, err := datastore.NewClient(ctx, ProjectName)
	if err != nil {
		return nil, err
	}
	datastoreClient = client
	return datastoreClient, nil
}

// CloseDatastoreClient releases resources owned by the shared client.
func CloseDatastoreClient() error {
	datastoreClientMu.Lock()
	defer datastoreClientMu.Unlock()

	if datastoreClient == nil {
		return nil
	}

	err := datastoreClient.Close()
	datastoreClient = nil
	return err
}
