package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// UserService is used by both the auth and metrics handlers for user lookups.
type UserService interface {
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	Exists(ctx context.Context, username string) (bool, error)
	Create(ctx context.Context, userInput model.UserInput) (*model.User, error)
}

// JWTService is used by both the auth and metrics handlers.
type JWTService interface {
	GenerateToken(username, role string) (string, error)
	ValidateToken(token string) (*auth.JwtClaim, error)
}

// AuthService encapsulates login/registration business logic. The HTTP handler
// is a thin adapter over the auth domain service (internal/domain/auth).
type AuthService interface {
	Register(ctx context.Context, input model.UserInput) (*model.User, error)
	Login(ctx context.Context, username, password string) (string, *model.User, error)
}

type authHandler struct {
	db          persistence.Transactioner
	authService AuthService
}

func NewAuthHandler(db persistence.Transactioner, authService AuthService) *authHandler {
	return &authHandler{
		db:          db,
		authService: authService,
	}
}

func (h *authHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input model.UserInput
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		apperrors.WriteBadRequest(w, "Invalid request payload")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		apperrors.WriteInternalError(w, "Error while starting transaction")
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	user, err := h.authService.Register(ctx, input)
	if err != nil {
		if apperrors.IsNotUniqueError(err) {
			apperrors.WriteErrorWithStatus(w, http.StatusConflict, "User already exists")
			return
		}
		logger.C(ctx).Errorf("Error while registering a user %+v", err.Error())
		apperrors.WriteInternalError(w, "Error creating user")
		return
	}

	if err = tx.Commit(); err != nil {
		apperrors.WriteInternalError(w, "Error committing transaction")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        user.ID,
		"username":  user.Username,
		"role":      user.Role,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
	})
}

func (h *authHandler) Login(w http.ResponseWriter, r *http.Request) {
	var creds model.UserInput
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		logger.C(ctx).Errorf("Error while decoding %+v", err.Error())
		apperrors.WriteBadRequest(w, "Invalid request payload")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		apperrors.WriteInternalError(w, "Error while starting transaction")
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	token, user, err := h.authService.Login(ctx, creds.Username, creds.Password)
	if err != nil {
		logger.C(ctx).Errorf("Login failed for %q: %+v", creds.Username, err.Error())
		apperrors.WriteUnauthorized(w, "Invalid credentials")
		return
	}

	if err = tx.Commit(); err != nil {
		apperrors.WriteInternalError(w, "Error committing transaction")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        user.ID,
		"token":     token,
		"username":  user.Username,
		"role":      user.Role,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
	})
}
