package datamodel

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/pkg/errors"
)

type Repository interface {
	Create(ctx context.Context, item model.DataModel) error
	Update(ctx context.Context, tnt string, item model.DataModel) error
	Delete(ctx context.Context, tnt, id string) error
	Exists(ctx context.Context, tnt, id string) (bool, error)
	Get(ctx context.Context, tnt, id string) (*model.DataModel, error)
	List(ctx context.Context, tnt string) ([]*model.DataModel, error)
}

type service struct {
	repo        Repository
	uuidService UUIDService
}

type UUIDService interface {
	Generate() string
}

func NewService(repo Repository, uuidService UUIDService) *service {
	return &service{
		repo:        repo,
		uuidService: uuidService,
	}
}

func (s *service) GetByID(ctx context.Context, id string) (*model.DataModel, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	dataModel, err := s.repo.Get(ctx, tnt, id)
	if err != nil {
		return nil, errors.Wrapf(err, "while retrieving data model by id %s", id)
	}

	return dataModel, nil
}

func (s *service) ListDataModels(ctx context.Context) ([]*model.DataModel, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	dataModels, err := s.repo.List(ctx, tnt)
	if err != nil {
		return nil, errors.Wrapf(err, "while listing data models for tenant %s", tnt)
	}

	return dataModels, nil
}

func (s *service) CreateDataModel(ctx context.Context, input model.DataModelInput) (*model.DataModel, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	id := s.uuidService.Generate()
	dataModel := input.ToDataModel(id)
	dataModel.TenantID = tnt

	if err = s.repo.Create(ctx, dataModel); err != nil {
		return nil, errors.Wrapf(err, "while creating data model")
	}

	createdDataModel, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, errors.Wrapf(err, "while retrieving created data model")
	}

	return createdDataModel, nil
}

func (s *service) UpdateDataModel(ctx context.Context, id string, input model.DataModelInput) (*model.DataModel, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	dataModel := input.ToDataModel(id)
	dataModel.TenantID = tnt

	if err = s.repo.Update(ctx, tnt, dataModel); err != nil {
		return nil, errors.Wrapf(err, "while updating data model")
	}

	return &dataModel, nil
}

func (s *service) Exists(ctx context.Context, id string) (bool, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return false, errors.Wrapf(err, "while loading tenant from context")
	}

	exists, err := s.repo.Exists(ctx, tnt, id)
	if err != nil {
		return false, errors.Wrapf(err, "while checking if data model exists")
	}

	return exists, nil
}

func (s *service) DeleteDataModel(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant from context")
	}

	exists, err := s.repo.Exists(ctx, tnt, id)
	if err != nil {
		return errors.Wrapf(err, "while checking if data model exists")
	}

	if !exists {
		return errors.Errorf("data model with id %s does not exist", id)
	}

	if err = s.repo.Delete(ctx, tnt, id); err != nil {
		return errors.Wrapf(err, "while deleting data model")
	}

	return nil
}
