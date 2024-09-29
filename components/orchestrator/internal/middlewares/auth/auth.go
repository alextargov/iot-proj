package auth

import (
	"context"
	"encoding/json"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"net/http"
	"strings"
)

type middleware struct {
	db          persistence.Transactioner
	jwtService  JWTService
	userService UserService
}

type UserService interface {
	GetByUsername(ctx context.Context, username string) (*model.User, error)
}

type JWTService interface {
	ValidateToken(username string) (*auth.JwtClaim, error)
}

func NewMiddleware(db persistence.Transactioner, jwtService JWTService, userService UserService) middleware {
	return middleware{
		db:          db,
		jwtService:  jwtService,
		userService: userService,
	}
}

func (m middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode("Missing Authorization header")
			return
		}

		// Split the "Bearer <token>" format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode("Invalid Authorization header format")
			return
		}

		tokenStr := parts[1]

		claims, err := m.jwtService.ValidateToken(tokenStr)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode("Invalid or expired token")
			return
		}

		tx, err := m.db.Begin()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode("Error while beginning transaction")
			return
		}
		defer m.db.RollbackUnlessCommitted(ctx, tx)

		ctx = persistence.SaveToContext(ctx, tx)

		user, err := m.userService.GetByUsername(ctx, claims.Username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode("Error while getting user")
			return
		}

		if err = tx.Commit(); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode("Error while committing transaction")
			return
		}

		// Attach username to the request context
		ctx = context.WithValue(ctx, "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
