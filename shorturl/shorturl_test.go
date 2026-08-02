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

package shorturl

import (
	"context"
	"reflect"
	"strings"
	"sync"
	"testing"
)

const testOriginalURL = "https://www.google.com"

func TestPersist(t *testing.T) {
	testPersist(context.Background(), t)
}

func testPersist(ctx context.Context, t *testing.T) *ShortURL {
	got, err := Persist(ctx, testOriginalURL)

	if nil != err {
		t.Error(err)
	}

	if nil == got || got.OriginalURL != testOriginalURL {
		t.Errorf("Persist() = %v", got)
	}

	return got
}

func TestPersistTwice(t *testing.T) {
	first := testPersist(context.Background(), t)
	second := testPersist(context.Background(), t)

	if !reflect.DeepEqual(first, second) {
		t.Errorf("Persit(): first = %v, second = %v", first, second)
	}
}

func TestPersistAcceptsURLLongerThanDatastoreKeyLimit(t *testing.T) {
	originalURL := "https://example.com/" + strings.Repeat("a", 1800)

	got, err := Persist(context.Background(), originalURL)
	if err != nil {
		t.Fatal(err)
	}
	if got.OriginalURL != originalURL {
		t.Fatalf("Persist().OriginalURL = %q, want original URL", got.OriginalURL)
	}
}

func TestPersistConcurrentDuplicatesReturnSameID(t *testing.T) {
	const workers = 8
	originalURL := "https://example.com/concurrent-duplicate"

	ids := make(chan int64, workers)
	errs := make(chan error, workers)
	var waitGroup sync.WaitGroup
	for range workers {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			shortURL, err := Persist(context.Background(), originalURL)
			if err != nil {
				errs <- err
				return
			}
			ids <- shortURL.ID
		}()
	}
	waitGroup.Wait()
	close(ids)
	close(errs)

	for err := range errs {
		t.Errorf("Persist() error = %v", err)
	}

	var firstID int64
	for id := range ids {
		if id == 0 {
			t.Error("Persist() returned an incomplete key")
		}
		if firstID == 0 {
			firstID = id
			continue
		}
		if id != firstID {
			t.Errorf("Persist() ID = %d, want %d", id, firstID)
		}
	}
}

func TestByURL(t *testing.T) {
	shouldExist, err := Persist(context.Background(), testOriginalURL)
	if nil != err {
		t.Fatal(err)
	}

	type args struct {
		ctx context.Context
		url string
	}
	tests := []struct {
		name    string
		args    args
		want    *ShortURL
		wantErr bool
	}{
		{
			name: "Non-existent URL",
			args: args{
				ctx: context.Background(),
				url: "http://www.hotmail.com",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Existing URL",
			args: args{
				ctx: context.Background(),
				url: testOriginalURL,
			},
			want:    shouldExist,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ByURL(tt.args.ctx, tt.args.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("ByURL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ByURL() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestByID(t *testing.T) {
	shouldExist, err := Persist(context.Background(), testOriginalURL)
	if nil != err {
		t.Fatal(err)
	}

	type args struct {
		ctx context.Context
		id  int64
	}
	tests := []struct {
		name    string
		args    args
		want    *ShortURL
		wantErr bool
	}{
		{
			name: "Existing",
			args: args{
				ctx: context.Background(),
				id:  shouldExist.ID,
			},
			want:    shouldExist,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ByID(tt.args.ctx, tt.args.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("ByID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ByID() = %v, want %v", got, tt.want)
			}
		})
	}
}
