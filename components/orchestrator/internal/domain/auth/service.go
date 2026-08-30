package auth

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
)

// UserService is the user-domain dependency the auth service composes over.
// It avoids duplicating user persistence SQL inside the auth domain.
type UserService interface {
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	Exists(ctx context.Context, username string) (bool, error)
	Create(ctx context.Context, userInput model.UserInput) (*model.User, error)
	UpdateRole(ctx context.Context, id string, role model.Role) (*model.User, error)
}

// TokenService generates signed JWT tokens for authenticated users.
type TokenService interface {
	GenerateToken(username, role string) (string, error)
}

type service struct {
	userService UserService
	tokenSvc    TokenService
}

// NewService builds the auth domain service.
func NewService(userService UserService, tokenSvc TokenService) *service {
	return &service{
		userService: userService,
		tokenSvc:    tokenSvc,
	}
}

// Register creates a new user with a hashed password. New self-registered
// users default to the least-privileged VIEWER role.
func (s *service) Register(ctx context.Context, input model.UserInput) (*model.User, error) {
	logger.C(ctx).Infof("Registering user %q", input.Username)

	exists, err := s.userService.Exists(ctx, input.Username)
	if err != nil {
		return nil, errors.Wrap(err, "while checking user existence")
	}
	if exists {
		return nil, apperrors.NewNotUniqueErrorWithMessage(resource.User, "user already exists")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, "while hashing password")
	}

	input.Password = string(hashed)
	if input.Role == "" {
		input.Role = model.RoleViewer
	}

	user, err := s.userService.Create(ctx, input)
	if err != nil {
		return nil, errors.Wrap(err, "while creating user")
	}

	return user, nil
}

// Login validates credentials and returns a signed JWT token carrying the
// user's role.
func (s *service) Login(ctx context.Context, username, password string) (string, *model.User, error) {
	logger.C(ctx).Infof("Authenticating user %q", username)

	exists, err := s.userService.Exists(ctx, username)
	if err != nil {
		return "", nil, errors.Wrap(err, "while checking user existence")
	}
	if !exists {
		return "", nil, apperrors.NewUnauthorizedError("invalid credentials")
	}

	user, err := s.userService.GetByUsername(ctx, username)
	if err != nil {
		return "", nil, apperrors.NewUnauthorizedError("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", nil, apperrors.NewUnauthorizedError("invalid credentials")
	}

	token, err := s.tokenSvc.GenerateToken(user.Username, string(user.Role))
	if err != nil {
		return "", nil, errors.Wrap(err, "while generating token")
	}

	return token, user, nil
}

// UpdateRole changes the role assigned to a user (admin-only operation,
// enforced by the @hasRole directive at the GraphQL layer).
func (s *service) UpdateRole(ctx context.Context, userID string, role model.Role) (*model.User, error) {
	logger.C(ctx).Infof("Updating role for user %s to %s", userID, role)

	if !role.IsValid() {
		return nil, apperrors.NewInvalidDataError("invalid role %q", string(role))
	}

	return s.userService.UpdateRole(ctx, userID, role)
}
