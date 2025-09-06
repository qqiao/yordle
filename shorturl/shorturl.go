// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2014 The Yordle Team
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

// Package shorturl provides functionality for the basic CRUD operations.
package shorturl

import (
	"context"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha512"
	"errors"
	"fmt"
	"log/slog"

	"cloud.google.com/go/datastore"

	"github.com/qqiao/yordle/config"
)

const (
	// KindName is the datastore kind name for short url.
	KindName = "ShortUrl"
)

// ShortURL is the entity used for storing short URL. Because of the fact that
// URLs can be more than 500 characters long and that we cannot index string
// properties longer than 500 characters directly to ensure uniqueness, we have
// to use the hash code of the URL as a fallback.
//
// We also use multiple hash algorithms just to eliminate the possibility of
// hash collisions of one particular hashing algorithm. Using SHA512, SHA1, and
// MD5 simultaneously should make a hash collision statistically extremely.
// improbable.
type ShortURL struct {
	ID          int64 `datastore:"-"`
	Hash        string
	OriginalURL string `datastore:"OriginalUrl,noindex"`
}

// UniqueKey is an entity whose sole purpose is to ensure the
// uniqueness of a ShortURL.
type UniqueKey struct {
	ID int64
}

// Error values
var (
	// ErrDatastoreInconsistent is returned when the datastore is in an
	// Inconsistent state. Typical example would be when the memcache
	// indicates that there should've been an instance of the short URL
	// stored but the actual instance cannot be found.
	ErrDatastoreInconsistent = errors.New("Datastore Inconsistent")

	ErrDatastoreWriteDisabled = errors.New("Datastore write disabled")

	// ErrNotFound is the error to be raised when the short URL matching the
	// search criteria cannot be found
	ErrNotFound = errors.New("Short URL not found")
)

// ByID loads the short URL by its ID.
func ByID(ctx context.Context, id int64) (*ShortURL, error) {
	client, err := datastore.NewClient(ctx, config.ProjectName)
	if nil != err {
		slog.Error("Unable to create datastore client", "error", err)
		return nil, err
	}

	var shortURL ShortURL

	if err := client.Get(ctx,
		datastore.IDKey(KindName, id, nil),
		&shortURL); nil != err {
		return nil, err
	}
	shortURL.ID = id

	return &shortURL, nil
}

// ByURL finds the short URL by its original long URL.
func ByURL(ctx context.Context, url string) (*ShortURL, error) {
	hash := hash(url)

	client, err := datastore.NewClient(ctx, config.ProjectName)
	if nil != err {
		slog.Error("Unable to create datastore client", "error", err)
		return nil, err
	}

	var results []*ShortURL

	q := datastore.NewQuery(KindName).
		//	Ancestor(uniqueKey).
		Filter("Hash = ", hash).
		Limit(1)

	keys, err := client.GetAll(ctx, q, &results)
	if nil != err {
		return nil, err
	}
	if len(results) < 1 {
		return nil, ErrNotFound
	}
	shortURL := results[0]
	shortURL.ID = keys[0].ID
	return shortURL, nil
}

// List lists all short URLs shorted by the their IDs.
func List(ctx context.Context, start int64, count int) ([]ShortURL, error) {
	return nil, nil
}

func hash(originalURL string) string {
	bytes := []byte(originalURL)
	return fmt.Sprintf("%x|%x|%x", sha512.Sum512(bytes), sha1.Sum(bytes), md5.Sum(bytes))
}

func keys(originalURL string) (*datastore.Key, *datastore.Key, string) {
	hash := hash(originalURL)
	uniqueKey := datastore.NameKey("Unique", originalURL, nil)
	objectKey := datastore.IncompleteKey(KindName, nil)
	return objectKey, uniqueKey, hash
}

// Persist persists the long URL by creating necessary objects.
func Persist(ctx context.Context, originalURL string) (*ShortURL, error) {
	var client *datastore.Client
	var err error
	if client, err = datastore.NewClient(ctx, config.ProjectName); nil != err {
		slog.Error("Unable to create datastore client", "error", err)
		return nil, err
	}

	objectKey, uniqueKey, hash := keys(originalURL)

	var sk *datastore.PendingKey
	shortURL := &ShortURL{}
	var commit *datastore.Commit

	if commit, err = client.RunInTransaction(ctx,
		func(tx *datastore.Transaction) error {
			slog.Info("Persisting ShortURL", "url", originalURL)
			var uk UniqueKey
			err = tx.Get(uniqueKey, &uk)
			if nil == err {
				slog.Info("ShortURL already exists, loading", "url", originalURL)
				shortURL, err = ByURL(ctx, originalURL)
				slog.Info("ShortURL loaded", "shortURL", shortURL)
				return err
			}

			if nil != err {
				if datastore.ErrNoSuchEntity != err {
					slog.Error("Error checking uniqueness", "error", err)
					return err
				}

				slog.Info("No unique key found, proceeding with persistence")
			}

			slog.Info("Storing actual ShortURL Object", "url", originalURL)
			shortURL.Hash = hash
			shortURL.OriginalURL = originalURL

			var err error
			if sk, err = tx.Put(objectKey, shortURL); nil != err {
				slog.Error("Error storing ShortURL Object", "error", err)
				return err
			}

			slog.Info("Done storing ShortURL", "url", originalURL)

			slog.Info("Storing UniqueKey", "url", originalURL)
			if _, err = tx.Put(uniqueKey, &UniqueKey{}); nil != err {
				slog.Error("Error storing ShortURL Unique Key", "error", err)
				return err
			}

			return nil
		}); nil != err {
		return nil, err
	}

	if nil != sk {
		key := commit.Key(sk)
		shortURL.ID = key.ID
	}

	return shortURL, nil
}
