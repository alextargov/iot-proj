package integration

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// IntegrationSvc defines the service surface used by the resolver.
type IntegrationSvc interface {
	Create(ctx context.Context, input model.CreateIntegrationInput) (*model.Integration, error)
	List(ctx context.Context) ([]*model.Integration, error)
	Get(ctx context.Context, id string) (*model.Integration, error)
	Update(ctx context.Context, id string, input model.UpdateIntegrationInput) (*model.Integration, error)
	Delete(ctx context.Context, id string) error
	Test(ctx context.Context, id string) (bool, error)
}

// IntegrationConv defines the conversions used by the resolver.
type IntegrationConv interface {
	ToGraphQL(*model.Integration) *graphql.Integration
	MultipleToGraphQL([]*model.Integration) []*graphql.Integration
	CreateInputFromGraphQL(graphql.CreateIntegrationInput) model.CreateIntegrationInput
	UpdateInputFromGraphQL(graphql.UpdateIntegrationInput) model.UpdateIntegrationInput
}

// Resolver handles GraphQL queries/mutations for integrations.
type Resolver struct {
	transact persistence.Transactioner
	svc      IntegrationSvc
	conv     IntegrationConv
}

// NewResolver creates a new integration resolver.
func NewResolver(transact persistence.Transactioner, svc IntegrationSvc, conv IntegrationConv) *Resolver {
	return &Resolver{transact: transact, svc: svc, conv: conv}
}

func (r *Resolver) Integrations(ctx context.Context) ([]*graphql.Integration, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	items, err := r.svc.List(ctx)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return r.conv.MultipleToGraphQL(items), nil
}

func (r *Resolver) Integration(ctx context.Context, id string) (*graphql.Integration, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	item, err := r.svc.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return r.conv.ToGraphQL(item), nil
}

func (r *Resolver) CreateIntegration(ctx context.Context, input graphql.CreateIntegrationInput) (*graphql.Integration, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	item, err := r.svc.Create(ctx, r.conv.CreateInputFromGraphQL(input))
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return r.conv.ToGraphQL(item), nil
}

func (r *Resolver) UpdateIntegration(ctx context.Context, id string, input graphql.UpdateIntegrationInput) (*graphql.Integration, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	item, err := r.svc.Update(ctx, id, r.conv.UpdateInputFromGraphQL(input))
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return r.conv.ToGraphQL(item), nil
}

func (r *Resolver) DeleteIntegration(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.svc.Delete(ctx, id); err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}
	return id, nil
}

func (r *Resolver) TestIntegration(ctx context.Context, id string) (bool, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return false, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	ok, err := r.svc.Test(ctx, id)
	if err != nil {
		return false, err
	}

	if err = tx.Commit(); err != nil {
		return false, err
	}
	return ok, nil
}
