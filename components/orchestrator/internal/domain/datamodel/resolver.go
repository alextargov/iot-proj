package datamodel

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type Service interface {
	CreateDataModel(ctx context.Context, input model.DataModelInput) (*model.DataModel, error)
	UpdateDataModel(ctx context.Context, id string, input model.UpdateDataModelInput) (*model.DataModel, error)
	DeleteDataModel(ctx context.Context, id string) error
	ListDataModels(ctx context.Context) ([]*model.DataModel, error)
	ListVersions(ctx context.Context, dataModelID string) ([]*model.DataModelVersion, error)
	GetVersion(ctx context.Context, dataModelID string, versionNumber int) (*model.DataModelVersion, error)
	RollbackToVersion(ctx context.Context, dataModelID string, toVersion int) (*model.DataModel, error)
}

type DeviceCountSvc interface {
	CountByDataModelID(ctx context.Context, dataModelID string) (int, error)
}

type Converter interface {
	MultipleToGraphQL(in []*model.DataModel) []*graphql.DataModel
	ToGraphQL(in *model.DataModel) *graphql.DataModel
	InputFromGraphQL(in graphql.DataModelInput) model.DataModelInput
	UpdateInputFromGraphQL(in graphql.UpdateDataModelInput) model.UpdateDataModelInput
	VersionToGraphQL(in *model.DataModelVersion) *graphql.DataModelVersion
	MultipleVersionsToGraphQL(in []*model.DataModelVersion) []*graphql.DataModelVersion
}

type Resolver struct {
	transact       persistence.Transactioner
	service        Service
	deviceCountSvc DeviceCountSvc
	converter      Converter
}

func NewResolver(transact persistence.Transactioner, service Service, deviceCountSvc DeviceCountSvc, conv Converter) *Resolver {
	return &Resolver{
		transact:       transact,
		service:        service,
		deviceCountSvc: deviceCountSvc,
		converter:      conv,
	}
}

func (r *Resolver) DataModels(ctx context.Context) ([]*graphql.DataModel, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	dataModels, err := r.service.ListDataModels(ctx)
	if err != nil {
		return nil, err
	}

	// Populate device counts
	for _, dm := range dataModels {
		count, err := r.deviceCountSvc.CountByDataModelID(ctx, dm.ID)
		if err != nil {
			return nil, err
		}
		dm.DeviceCount = count
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.converter.MultipleToGraphQL(dataModels), nil
}

func (r *Resolver) CreateDataModel(ctx context.Context, input graphql.DataModelInput) (*graphql.DataModel, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.converter.InputFromGraphQL(input)

	dataModel, err := r.service.CreateDataModel(ctx, modelInput)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.converter.ToGraphQL(dataModel), nil
}

func (r *Resolver) UpdateDataModel(ctx context.Context, id string, input graphql.UpdateDataModelInput) (*graphql.DataModel, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.converter.UpdateInputFromGraphQL(input)

	dataModel, err := r.service.UpdateDataModel(ctx, id, modelInput)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.converter.ToGraphQL(dataModel), nil
}

func (r *Resolver) DeleteDataModel(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	err = r.service.DeleteDataModel(ctx, id)
	if err != nil {
		return "", err
	}

	err = tx.Commit()
	if err != nil {
		return "", err
	}

	return id, nil
}

func (r *Resolver) DataModelVersions(ctx context.Context, dataModelID string) ([]*graphql.DataModelVersion, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	versions, err := r.service.ListVersions(ctx, dataModelID)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.converter.MultipleVersionsToGraphQL(versions), nil
}

func (r *Resolver) DataModelVersion(ctx context.Context, dataModelID string, version int) (*graphql.DataModelVersion, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	v, err := r.service.GetVersion(ctx, dataModelID, version)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.converter.VersionToGraphQL(v), nil
}

func (r *Resolver) RollbackDataModel(ctx context.Context, dataModelID string, toVersion int) (*graphql.DataModel, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	dataModel, err := r.service.RollbackToVersion(ctx, dataModelID, toVersion)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.converter.ToGraphQL(dataModel), nil
}
