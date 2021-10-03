package users

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/auth"
	"github.com/iot-proj/components/orchestrator/pkg/database/conditions"
	"github.com/pkg/errors"
	"go.mongodb.org/mongo-driver/bson"
)

type UserRepository interface {
	GetAll(ctx context.Context) ([]*UserModel, error)
	Create(ctx context.Context, model *UserModel) (string, error)
	Exists(ctx context.Context, id string) (bool, error)
	Update(ctx context.Context, model *UserModel) error
	GetGlobalByID(ctx context.Context, id string) (*UserModel, error)
	GetOne(ctx context.Context, condition bson.M) (*UserModel, error)
	DeleteGlobal(ctx context.Context, id string) error
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

func (s *service) GetAll(ctx context.Context) ([]*UserModel, error) {
	return s.userRepo.GetAll(ctx)
}

func (s *service) GetGlobalByID(ctx context.Context, id string) (*UserModel, error) {
	return s.userRepo.GetGlobalByID(ctx, id)
}

func (s *service) Create(ctx context.Context, user *UserModel) (string, error) {
	return s.userRepo.Create(ctx, user)
}

func (s *service) Update(ctx context.Context, user *UserModel) error {
	return s.userRepo.Update(ctx, user)
}

func (s *service) Exists(ctx context.Context, id string) (bool, error) {
	return s.userRepo.Exists(ctx, id)
}

func (s *service) DeleteById(ctx context.Context, id string) error {
	return s.userRepo.DeleteGlobal(ctx, id)
}

func (s *service) Login(ctx context.Context, loginModel LoginModel) (string, error) {
	condition, err := conditions.Equals("username", loginModel.Username, false)
	if err != nil {
		return "", err
	}

	user, err := s.userRepo.GetOne(ctx, condition.Map())
	if err != nil {
		return "", errors.Wrapf(err, "while getting user with username %s", loginModel.Username)
	}

	if isEqual, err := s.encryptionService.Compare(user.Password, loginModel.Password); !isEqual || err != nil {
		return "", errors.Wrapf(err, "while comparing passwords")
	}

	jwtWrapper := auth.NewJwtWrapper(s.Config)

	signedToken, err := jwtWrapper.GenerateToken(user.Username)

	return signedToken, nil
}

func (s *service) Register(ctx context.Context, user *UserModel) (string, error) {
	hashedPassword, err := s.encryptionService.Encrypt(user.Password)
	if err != nil {
		return "", err
	}

	user.Password = hashedPassword

	_, err = s.userRepo.Create(ctx, user)
	if err != nil {
		return "", errors.Wrapf(err, "while creating user")
	}

	jwtWrapper := auth.NewJwtWrapper(s.Config)

	signedToken, err := jwtWrapper.GenerateToken(user.Username)

	return signedToken, nil
}
