package datamodel

import (
	"context"
	"time"

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
	CreateVersion(ctx context.Context, version model.DataModelVersion) error
	ListVersions(ctx context.Context, dataModelID string) ([]*model.DataModelVersion, error)
	GetVersion(ctx context.Context, dataModelID string, versionNumber int) (*model.DataModelVersion, error)
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

	// Create initial version
	version := model.DataModelVersion{
		ID:                s.uuidService.Generate(),
		DataModelID:       id,
		VersionNumber:     1,
		Schema:            input.Schema,
		ChangeDescription: stringPtr("Initial version"),
		CreatedAt:         time.Now(),
		CreatedBy:         &tnt,
	}
	if err = s.repo.CreateVersion(ctx, version); err != nil {
		return nil, errors.Wrapf(err, "while creating initial data model version")
	}

	createdDataModel, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, errors.Wrapf(err, "while retrieving created data model")
	}

	return createdDataModel, nil
}

func (s *service) UpdateDataModel(ctx context.Context, id string, input model.UpdateDataModelInput) (*model.DataModel, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	existing, err := s.repo.Get(ctx, tnt, id)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting existing data model")
	}

	// Apply updates
	if input.Name != nil {
		existing.Name = *input.Name
	}
	if input.Description != nil {
		existing.Description = *input.Description
	}

	schemaChanged := false
	if input.Schema != nil {
		existing.Schema = *input.Schema
		schemaChanged = true
	}

	// Increment version if schema changed
	if schemaChanged {
		existing.CurrentVersion++

		// Create new version record
		version := model.DataModelVersion{
			ID:                s.uuidService.Generate(),
			DataModelID:       id,
			VersionNumber:     existing.CurrentVersion,
			Schema:            *input.Schema,
			ChangeDescription: input.ChangeDescription,
			CreatedAt:         time.Now(),
			CreatedBy:         &tnt,
		}
		if err = s.repo.CreateVersion(ctx, version); err != nil {
			return nil, errors.Wrapf(err, "while creating data model version")
		}
	}

	if err = s.repo.Update(ctx, tnt, *existing); err != nil {
		return nil, errors.Wrapf(err, "while updating data model")
	}

	return existing, nil
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

func (s *service) ListVersions(ctx context.Context, dataModelID string) ([]*model.DataModelVersion, error) {
	versions, err := s.repo.ListVersions(ctx, dataModelID)
	if err != nil {
		return nil, errors.Wrapf(err, "while listing versions for data model %s", dataModelID)
	}

	return versions, nil
}

func (s *service) GetVersion(ctx context.Context, dataModelID string, versionNumber int) (*model.DataModelVersion, error) {
	version, err := s.repo.GetVersion(ctx, dataModelID, versionNumber)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting version %d for data model %s", versionNumber, dataModelID)
	}

	return version, nil
}

func (s *service) RollbackToVersion(ctx context.Context, dataModelID string, toVersion int) (*model.DataModel, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	existing, err := s.repo.Get(ctx, tnt, dataModelID)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting existing data model")
	}

	// Get the version to rollback to
	targetVersion, err := s.repo.GetVersion(ctx, dataModelID, toVersion)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting target version %d", toVersion)
	}

	// Create a new version with the old schema
	existing.CurrentVersion++
	existing.Schema = targetVersion.Schema

	changeDesc := "Rolled back to version " + string(rune('0'+toVersion))
	version := model.DataModelVersion{
		ID:                s.uuidService.Generate(),
		DataModelID:       dataModelID,
		VersionNumber:     existing.CurrentVersion,
		Schema:            targetVersion.Schema,
		ChangeDescription: &changeDesc,
		CreatedAt:         time.Now(),
		CreatedBy:         &tnt,
	}
	if err = s.repo.CreateVersion(ctx, version); err != nil {
		return nil, errors.Wrapf(err, "while creating rollback version")
	}

	if err = s.repo.Update(ctx, tnt, *existing); err != nil {
		return nil, errors.Wrapf(err, "while updating data model after rollback")
	}

	return existing, nil
}

func stringPtr(s string) *string {
	return &s
}
