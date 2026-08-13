package middlewares

import (
	"net/http"
	"sync"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"golang.org/x/time/rate"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	// Global rate limiter
	globalLimiter *rate.Limiter
	// Per-client rate limiters
	clients map[string]*clientLimiter
	mu      sync.RWMutex
	// Configuration
	config RateLimitConfig
}

// RateLimitConfig configures the rate limiter
type RateLimitConfig struct {
	// RequestsPerSecond is the global rate limit
	RequestsPerSecond float64
	// BurstSize is the maximum burst size
	BurstSize int
	// PerClientRequestsPerSecond is the per-client rate limit
	PerClientRequestsPerSecond float64
	// PerClientBurstSize is the per-client burst size
	PerClientBurstSize int
	// CleanupInterval is how often to clean up stale client limiters
	CleanupInterval time.Duration
	// ClientTTL is how long to keep a client limiter after last use
	ClientTTL time.Duration
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerSecond:          100, // 100 requests per second globally
		BurstSize:                  200,
		PerClientRequestsPerSecond: 10, // 10 requests per second per client
		PerClientBurstSize:         20,
		CleanupInterval:            time.Minute * 5,
		ClientTTL:                  time.Minute * 10,
	}
}

type clientLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter with the given configuration
func NewRateLimiter(config RateLimitConfig) *RateLimiter {
	rl := &RateLimiter{
		globalLimiter: rate.NewLimiter(rate.Limit(config.RequestsPerSecond), config.BurstSize),
		clients:       make(map[string]*clientLimiter),
		config:        config,
	}

	// Start cleanup goroutine
	go rl.cleanupLoop()

	return rl
}

// cleanupLoop periodically removes stale client limiters
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.config.CleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		rl.cleanup()
	}
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	for key, client := range rl.clients {
		if now.Sub(client.lastSeen) > rl.config.ClientTTL {
			delete(rl.clients, key)
		}
	}
}

// getClientLimiter returns or creates a rate limiter for the given client key
func (rl *RateLimiter) getClientLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if client, exists := rl.clients[key]; exists {
		client.lastSeen = time.Now()
		return client.limiter
	}

	limiter := rate.NewLimiter(
		rate.Limit(rl.config.PerClientRequestsPerSecond),
		rl.config.PerClientBurstSize,
	)
	rl.clients[key] = &clientLimiter{
		limiter:  limiter,
		lastSeen: time.Now(),
	}
	return limiter
}

// getClientKey extracts a unique identifier for the client from the request
func getClientKey(r *http.Request) string {
	// Try to get the real IP from common proxy headers
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	// Fall back to remote address
	return r.RemoteAddr
}

// Middleware returns an HTTP middleware that applies rate limiting
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check global rate limit
		if !rl.globalLimiter.Allow() {
			apperrors.WriteErrorWithStatus(w, http.StatusTooManyRequests, "Global rate limit exceeded")
			return
		}

		// Check per-client rate limit
		clientKey := getClientKey(r)
		clientLimiter := rl.getClientLimiter(clientKey)
		if !clientLimiter.Allow() {
			apperrors.WriteErrorWithStatus(w, http.StatusTooManyRequests, "Rate limit exceeded")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RateLimitMiddleware creates a simple rate limiting middleware with default config
func RateLimitMiddleware() func(http.Handler) http.Handler {
	rl := NewRateLimiter(DefaultRateLimitConfig())
	return rl.Middleware
}

// RateLimitMiddlewareWithConfig creates a rate limiting middleware with custom config
func RateLimitMiddlewareWithConfig(config RateLimitConfig) func(http.Handler) http.Handler {
	rl := NewRateLimiter(config)
	return rl.Middleware
}
