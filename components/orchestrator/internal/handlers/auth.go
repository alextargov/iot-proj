package handlers

import (
	"context"
	"encoding/json"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"golang.org/x/crypto/bcrypt"
	"net/http"
)

type UserService interface {
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	Exists(ctx context.Context, username string) (bool, error)
	Create(ctx context.Context, userInput model.UserInput) (*model.User, error)
}

type JWTService interface {
	GenerateToken(username string) (string, error)
}

type authHandler struct {
	db          persistence.Transactioner
	userService UserService
	jwtService  JWTService
}

func NewAuthHandler(db persistence.Transactioner, userService UserService, jwtService JWTService) *authHandler {
	return &authHandler{
		db:          db,
		userService: userService,
		jwtService:  jwtService,
	}
}

func (h *authHandler) Register(w http.ResponseWriter, r *http.Request) {
	var user model.UserInput
	ctx := r.Context()

	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode("Invalid request payload")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error while starting transaction")
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	exists, err := h.userService.Exists(ctx, user.Username)
	if err != nil {
		logger.C(ctx).Errorf("Error while checking for existance %+v", err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error checking user existence")
		return
	}

	if exists {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode("User already exists")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error hashing user password")
		return
	}

	user.Password = string(hashedPassword)

	if _, err = h.userService.Create(ctx, user); err != nil {
		logger.C(ctx).Errorf("Error while creating a user %+v", err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error creating user")
		return
	}

	if err = tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error committing transaction")
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *authHandler) Login(w http.ResponseWriter, r *http.Request) {
	var user *model.User
	ctx := r.Context()
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		logger.C(ctx).Errorf("Error while decoding %+v", err.Error())
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode("Invalid request payload")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error while starting transaction")
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	exists, err := h.userService.Exists(ctx, user.Username)
	if err != nil {
		logger.C(ctx).Errorf("Error while checking for existance %+v", err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error checking user existence")
		return
	}

	if !exists {
		logger.C(ctx).Errorf("User with name %s does not exist", user.Username)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode("User does not exist")
		return
	}

	logger.C(ctx).Infof("User %q exists", user.Username)

	userFromService, err := h.userService.GetByUsername(ctx, user.Username)
	if err != nil {
		logger.C(ctx).Errorf("Error while getting user %+v", err.Error())
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode("Error getting user from service")
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(userFromService.Password), []byte(user.Password))
	if err != nil {
		logger.C(ctx).Errorf("Error while comparing passwords %+v", err.Error())
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode("Invalid credentials")
		return
	}

	tokenString, err := h.jwtService.GenerateToken(user.Username)
	if err != nil {
		logger.C(ctx).Errorf("Error while generating a token %+v", err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error generating token")
		return
	}

	if err = tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode("Error committing transaction")
		return
	}

	// Return the token in the response body as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        userFromService.ID,
		"token":     tokenString,
		"username":  userFromService.Username,
		"createdAt": userFromService.CreatedAt,
		"updatedAt": userFromService.UpdatedAt,
	})
}
