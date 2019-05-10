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

package config

import (
	"context"
	"log"

	"cloud.google.com/go/datastore"
)

// InstanceKey is the key we use to store the unique  DynamicConfig instance
// in memcache
const InstanceKey = "DYNAMIC_CONFIG_INSTANCE"

// KindName is the datastore kind name
const KindName = "DynamicConfig"

// DefaultInstance is the default configuration with sensible default
// values
var DefaultInstance = DynamicConfig{
	AppName: "Yordle URL Shortener",
}

// DynamicConfig represents dynamic configuration that can be changed at
// run time through the configuration screen.
type DynamicConfig struct {
	AppName string

	GoogleAnalytics GoogleAnalyticsConfig
}

// GoogleAnalyticsConfig represents the configuration for google analytics
type GoogleAnalyticsConfig struct {
	Enabled    bool
	TrackingID string
}

// Get returns the instance of the DynamicConfig.
func Get(ctx context.Context) (*DynamicConfig, error) {
	log.Println("Loading DynamicConfig from datastore...")

	client, err := datastore.NewClient(ctx, ProjectName)
	if nil != err {
		log.Printf("Unable to create datastore client. Error: %s", err)
		return nil, err
	}
	key := datastore.NameKey(KindName, InstanceKey, nil)

	var cfg DynamicConfig

	if err := client.Get(ctx, key, &cfg); nil != err {
		if datastore.ErrNoSuchEntity != err {
			return nil, err
		}

		log.Println(
			"DynamicConfig instance not found in datastore, creating...")
		if _, err = client.Put(ctx, key, &cfg); nil != err {
			return nil, err
		}
	}

	return &cfg, nil
}

// MustGet returns the dynamic config instance.
// This function calls Get and if an error is returned, it will then return
// DefaultInstance.
func MustGet(ctx context.Context) *DynamicConfig {
	cfg, err := Get(ctx)
	if nil != err {
		log.Printf(
			"Unable to load DynamicConfig. Error: %s.\nUsing defaults...",
			err.Error())
		cfg = &DefaultInstance
	}
	return cfg
}

// MustGetAsync is the same as MustGet except it returns a channel. This
// allows this method to be more easily ultilized asynchronously.
func MustGetAsync(ctx context.Context) <-chan *DynamicConfig {
	ch := make(chan *DynamicConfig, 1)

	go func() {
		defer close(ch)

		ch <- MustGet(ctx)
	}()
	return ch
}

// Save saves the dynamic config into the underlying datastore.
func Save(ctx context.Context, cfg *DynamicConfig) error {
	log.Println("Saving DynamicConfig instance into datastore...")

	client, err := datastore.NewClient(ctx, "")
	if nil != err {
		log.Printf("Unable to create datastore client. Error: %s", err)
		return err
	}
	key := datastore.NameKey(KindName, InstanceKey, nil)

	// First we need to save it to the datastore. If we can't even store,
	// we must error out
	if _, err := client.Put(ctx, key, &cfg); nil != err {
		return err
	}

	return nil
}
