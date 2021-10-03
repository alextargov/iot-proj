package devices

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/auth"
)

type UserRepository interface {
	Exists(ctx context.Context, id string) (bool, error)
	DeleteGlobalById(ctx context.Context, id string) error
	GetGlobalByID(ctx context.Context, id string) (*Model, error)
	GetScopedByID(ctx context.Context, userId, id string) (*Model, error)
	GetScopedAll(ctx context.Context, userId string) ([]*Model, error)
	GetAll(ctx context.Context) ([]*Model, error)
	Create(ctx context.Context, model *Model) (string, error)
	Update(ctx context.Context, model *Model) error
}

type EncryptionService interface {
	Encrypt(str string) (string, error)
	Compare(hash, rawStr string) (bool, error)
}

type service struct {
	userRepo          UserRepository
	encryptionService EncryptionService
	Config            auth.Config
}

func NewService(Config auth.Config, repo UserRepository, encryptionService EncryptionService) *service {
	return &service{
		userRepo:          repo,
		encryptionService: encryptionService,
		Config:            Config,
	}
}

func (s *service) GetAll(ctx context.Context) ([]*Model, error) {
	return s.userRepo.GetAll(ctx)
}

func (s *service) GetScopedByID(ctx context.Context, userId, id string) (*Model, error) {
	return s.userRepo.GetScopedByID(ctx, userId, id)
}

func (s *service) GetScopedAll(ctx context.Context, userId string) ([]*Model, error) {
	return s.userRepo.GetScopedAll(ctx, userId)
}

func (s *service) Create(ctx context.Context, user *Model) (string, error) {
	return s.userRepo.Create(ctx, user)
}

func (s *service) Update(ctx context.Context, user *Model) error {
	return s.userRepo.Update(ctx, user)
}

func (s *service) Exists(ctx context.Context, id string) (bool, error) {
	return s.userRepo.Exists(ctx, id)
}

func (s *service) DeleteById(ctx context.Context, id string) error {
	return s.userRepo.DeleteGlobalById(ctx, id)
}
