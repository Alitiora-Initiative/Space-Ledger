// Space Ledger — Price Engine (Go)
// =================================
// High-throughput HTTP microservice for bonding curve price lookups.
// Runs on port 5002. The Node.js server can call it for batch price queries
// when the Python service is not running (both are optional — the Node server
// has its own JS implementation as the primary).
//
// Build:  go build -o price_engine native/price_engine.go
// Run:    ./price_engine
// Or:     go run native/price_engine.go

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
)

// ── Constants ─────────────────────────────────────────────────────────────────
const (
	TotalBlocks   = 10_000_000_000
	StartingPrice = 0.001
	TargetPrice   = 10.0
	PlatformFee   = 0.10
	Slope         = (TargetPrice - StartingPrice) / TotalBlocks
)

// ── Core pricing ──────────────────────────────────────────────────────────────

func blockPrice(blockID int64) float64 {
	if blockID < 0 {
		blockID = 0
	}
	if blockID >= TotalBlocks {
		blockID = TotalBlocks - 1
	}
	return Slope*float64(blockID) + StartingPrice
}

// totalPriceRange uses the arithmetic series sum (O(1)) — no loop needed.
func totalPriceRange(start, count int64) float64 {
	first := blockPrice(start)
	last := blockPrice(start + count - 1)
	return float64(count) / 2.0 * (first + last)
}

// ── HTTP handlers ─────────────────────────────────────────────────────────────

type PriceResponse struct {
	BlockID float64 `json:"blockId"`
	Price   float64 `json:"price"`
}

type RangeResponse struct {
	Prices []PriceResponse `json:"prices"`
	Total  float64         `json:"totalPrice"`
	WithFee float64        `json:"totalWithFee"`
}

func handlePrice(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PriceResponse{
		BlockID: float64(id),
		Price:   math.Round(blockPrice(id)*1e9) / 1e9,
	})
}

func handleRange(w http.ResponseWriter, r *http.Request) {
	startStr := r.URL.Query().Get("start")
	countStr := r.URL.Query().Get("count")

	start, _ := strconv.ParseInt(startStr, 10, 64)
	count, err := strconv.ParseInt(countStr, 10, 64)
	if err != nil || count <= 0 {
		count = 10
	}
	if count > 1000 {
		count = 1000
	}

	prices := make([]PriceResponse, count)
	for i := int64(0); i < count; i++ {
		bid := start + i
		prices[i] = PriceResponse{
			BlockID: float64(bid),
			Price:   math.Round(blockPrice(bid)*1e9) / 1e9,
		}
	}

	total := totalPriceRange(start, count)
	fee := PlatformFee * float64(count)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RangeResponse{
		Prices:  prices,
		Total:   math.Round(total*1e9) / 1e9,
		WithFee: math.Round((total+fee)*1e9) / 1e9,
	})
}

type InfoResponse struct {
	TotalBlocks   int64   `json:"totalBlocks"`
	StartingPrice float64 `json:"startingPrice"`
	TargetPrice   float64 `json:"targetPrice"`
	Slope         float64 `json:"slope"`
	PlatformFee   float64 `json:"platformFee"`
	Formula       string  `json:"formula"`
}

func handleInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(InfoResponse{
		TotalBlocks:   TotalBlocks,
		StartingPrice: StartingPrice,
		TargetPrice:   TargetPrice,
		Slope:         Slope,
		PlatformFee:   PlatformFee,
		Formula:       fmt.Sprintf("P(x) = %.4e·x + %.3f", Slope, StartingPrice),
	})
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/price",       handlePrice)
	mux.HandleFunc("/price/range", handleRange)
	mux.HandleFunc("/info",        handleInfo)

	// CORS for browser calls during development
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		mux.ServeHTTP(w, r)
	})

	port := "5002"
	log.Printf("Space Ledger Go price engine running on http://localhost:%s", port)
	log.Printf("  GET /price?id=<blockId>")
	log.Printf("  GET /price/range?start=<n>&count=<n>")
	log.Printf("  GET /info")
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
