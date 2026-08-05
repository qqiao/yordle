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

	// ErrNotFound is the error to be raised when the short URL matching the
	// search criteria cannot be found
	ErrNotFound = errors.New("Short URL not found")
)

// ByID loads the short URL by its ID.
func ByID(ctx context.Context, id int64) (*ShortURL, error) {
	client, err := config.DatastoreClient(ctx)
	if nil != err {
		slog.Error("Unable to create datastore client", "error", err)
		return nil, err
	}

	return byID(ctx, client, id)
}

func byID(ctx context.Context, client *datastore.Client, id int64) (*ShortURL, error) {
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
	client, err := config.DatastoreClient(ctx)
	if nil != err {
		slog.Error("Unable to create datastore client", "error", err)
		return nil, err
	}

	return byURL(ctx, client, url)
}

func byURL(ctx context.Context, client *datastore.Client, url string) (*ShortURL, error) {
	hash := hash(url)
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

func hash(originalURL string) string {
	bytes := []byte(originalURL)
	return fmt.Sprintf("%x|%x|%x", sha512.Sum512(bytes), sha1.Sum(bytes), md5.Sum(bytes))
}

func keys(originalURL string) (*datastore.Key, *datastore.Key, string) {
	hash := hash(originalURL)
	uniqueKey := datastore.NameKey("Unique", hash, nil)
	objectKey := datastore.IncompleteKey(KindName, nil)
	return objectKey, uniqueKey, hash
}

// Persist persists the long URL by creating necessary objects.
func Persist(ctx context.Context, originalURL string) (*ShortURL, error) {
	client, err := config.DatastoreClient(ctx)
	if nil != err {
		slog.Error("Unable to create datastore client", "error", err)
		return nil, err
	}

	objectKey, uniqueKey, urlHash := keys(originalURL)
	var unique UniqueKey
	if err := client.Get(ctx, uniqueKey, &unique); err == nil {
		if unique.ID == 0 {
			return nil, ErrDatastoreInconsistent
		}
		return byID(ctx, client, unique.ID)
	} else if err != datastore.ErrNoSuchEntity {
		return nil, err
	}

	// Older releases keyed Unique entities by the full URL and did not store
	// the ShortURL ID. Query once before the transaction so existing data can
	// be backfilled into the new bounded, strongly-consistent mapping.
	legacyShortURL, legacyErr := byURL(ctx, client, originalURL)
	if legacyErr != nil && !errors.Is(legacyErr, ErrNotFound) {
		return nil, legacyErr
	}
	allocatedKeys, err := client.AllocateIDs(ctx, []*datastore.Key{objectKey})
	if err != nil {
		return nil, err
	}
	objectKey = allocatedKeys[0]

	shortURL := &ShortURL{}
	_, err = client.RunInTransaction(ctx, func(tx *datastore.Transaction) error {
		unique = UniqueKey{}
		if err := tx.Get(uniqueKey, &unique); err == nil {
			if unique.ID == 0 {
				return ErrDatastoreInconsistent
			}

			var existing ShortURL
			if err := tx.Get(datastore.IDKey(KindName, unique.ID, nil), &existing); err != nil {
				return err
			}
			existing.ID = unique.ID
			*shortURL = existing
			return nil
		} else if err != datastore.ErrNoSuchEntity {
			return err
		}

		if legacyShortURL != nil {
			*shortURL = *legacyShortURL
			_, err := tx.Put(uniqueKey, &UniqueKey{ID: legacyShortURL.ID})
			return err
		}

		*shortURL = ShortURL{
			ID:          objectKey.ID,
			Hash:        urlHash,
			OriginalURL: originalURL,
		}
		if _, err := tx.Put(objectKey, shortURL); err != nil {
			return err
		}
		if _, err := tx.Put(uniqueKey, &UniqueKey{ID: objectKey.ID}); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		slog.Error("Unable to persist short URL", "url_hash", urlHash, "error", err)
		return nil, err
	}

	slog.Info("Short URL persisted", "url_hash", urlHash, "id", shortURL.ID)

	return shortURL, nil
}
