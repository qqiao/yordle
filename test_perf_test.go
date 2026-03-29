package main

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"sync"
)

var configLocales = []string{"en-US", "fr-FR", "zh-CN"}

func preloadedStateCurrent(ctx context.Context) <-chan string {
	output := make(chan string)

	go func() {
		defer close(output)

		str, err := json.Marshal(map[string]interface{}{
			"languages": configLocales,
		})

		if nil != err {
			fmt.Printf("Unable to marshal preloaded state. Error: %v\n", err)
		}
		output <- string(str)
	}()

	return output
}

var (
	cachedPreloadedState string
	preloadedStateOnce   sync.Once
)

func preloadedStateOptimized(ctx context.Context) <-chan string {
	output := make(chan string, 1)

	preloadedStateOnce.Do(func() {
		str, err := json.Marshal(map[string]interface{}{
			"languages": configLocales,
		})
		if err != nil {
			fmt.Printf("Unable to marshal preloaded state. Error: %v\n", err)
		}
		cachedPreloadedState = string(str)
	})

	output <- cachedPreloadedState
	close(output)

	return output
}

func BenchmarkCurrent(b *testing.B) {
	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		<-preloadedStateCurrent(ctx)
	}
}

func BenchmarkOptimized(b *testing.B) {
	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		<-preloadedStateOptimized(ctx)
	}
}
