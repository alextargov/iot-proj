package datamodel

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type Service interface {
	CreateDataModel(ctx context.Context, input model.DataModelInput) (*model.DataModel, error)
	UpdateDataModel(ctx context.Context, id string, input model.DataModelInput) (*model.DataModel, error)
	DeleteDataModel(ctx context.Context, id string) error
	ListDataModels(ctx context.Context) ([]*model.DataModel, error)
}

type Converter interface {
	MultipleToGraphQL(in []*model.DataModel) []*graphql.DataModel
	ToGraphQL(in *model.DataModel) *graphql.DataModel
	InputFromGraphQL(in graphql.DataModelInput) model.DataModelInput
}

type Resolver struct {
	transact persistence.Transactioner

	service   Service
	converter Converter
}

func NewResolver(transact persistence.Transactioner, service Service, conv Converter) *Resolver {
	return &Resolver{
		transact:  transact,
		service:   service,
		converter: conv,
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

func (r *Resolver) UpdateDataModel(ctx context.Context, id string, input graphql.DataModelInput) (*graphql.DataModel, error) {
	return nil, nil
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
