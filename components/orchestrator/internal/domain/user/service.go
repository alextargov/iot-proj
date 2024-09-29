package user

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

type UserRepository interface {
	GetByID(ctx context.Context, id string) (*model.User, error)
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	Exists(ctx context.Context, username string) (bool, error)
	Create(ctx context.Context, item model.User) error
	DeleteByID(ctx context.Context, id string) error
}

type EncryptionService interface {
	Encrypt(str string) (string, error)
	Compare(hash, rawStr string) (bool, error)
}

type UUIDService interface {
	Generate() string
}

type service struct {
	userRepo    UserRepository
	uuidService UUIDService
}

func NewService(repo UserRepository, uuidService UUIDService) *service {
	return &service{
		userRepo:    repo,
		uuidService: uuidService,
	}
}

func (s *service) GetByID(ctx context.Context, id string) (*model.User, error) {
	logger.C(ctx).Infof("Getting user by id %s", id)

	return s.userRepo.GetByID(ctx, id)
}

func (s *service) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	logger.C(ctx).Infof("Getting user by username %s", username)

	user, err := s.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting user by username %s", username)
	}

	return user, nil
}

func (s *service) Exists(ctx context.Context, username string) (bool, error) {
	logger.C(ctx).Infof("Exists user by username %s", username)

	exists, err := s.userRepo.Exists(ctx, username)
	if err != nil {
		return false, errors.Wrapf(err, "while checking if user exists %s", username)
	}

	return exists, nil
}

func (s *service) Create(ctx context.Context, userInput model.UserInput) (*model.User, error) {
	logger.C(ctx).Infof("Creating user with username: %s", userInput.Username)

	id := s.uuidService.Generate()
	user := userInput.ToUser(id)

	var err error
	if err = s.userRepo.Create(ctx, user); err != nil {
		return nil, errors.Wrapf(err, "while creating user with username: %s", userInput.Username)
	}

	return &user, err
}

func (s *service) DeleteByID(ctx context.Context, id string) error {
	logger.C(ctx).Infof("Deleting user with ID %s", id)

	if err := s.userRepo.DeleteByID(ctx, id); err != nil {
		return errors.Wrapf(err, "while deleting user with ID %s", id)
	}

	return nil
}
