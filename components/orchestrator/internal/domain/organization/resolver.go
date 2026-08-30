package organization

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// OrgSvc defines the organization service surface used by the resolver.
type OrgSvc interface {
	Create(ctx context.Context, input model.CreateOrganizationInput) (*model.Organization, error)
	List(ctx context.Context) ([]*model.Organization, error)
	Get(ctx context.Context, id string) (*model.Organization, error)
	Rename(ctx context.Context, id, name string) (*model.Organization, error)
	Delete(ctx context.Context, id string) error
	AddMember(ctx context.Context, input model.AddOrganizationMemberInput) (*model.Organization, error)
	UpdateMemberRole(ctx context.Context, orgID, userID string, role model.Role) (*model.Organization, error)
	RemoveMember(ctx context.Context, orgID, userID string) (*model.Organization, error)
}

// OrgConv defines the conversions used by the resolver.
type OrgConv interface {
	ToGraphQL(*model.Organization) *graphql.Organization
	MultipleToGraphQL([]*model.Organization) []*graphql.Organization
}

// Resolver handles GraphQL queries/mutations for organizations.
type Resolver struct {
	transact persistence.Transactioner
	svc      OrgSvc
	conv     OrgConv
}

// NewResolver creates a new organization resolver.
func NewResolver(transact persistence.Transactioner, svc OrgSvc, conv OrgConv) *Resolver {
	return &Resolver{transact: transact, svc: svc, conv: conv}
}

func (r *Resolver) Organizations(ctx context.Context) ([]*graphql.Organization, error) {
	return r.withTx(ctx, func(ctx context.Context) ([]*graphql.Organization, error) {
		items, err := r.svc.List(ctx)
		if err != nil {
			return nil, err
		}
		return r.conv.MultipleToGraphQL(items), nil
	})
}

func (r *Resolver) Organization(ctx context.Context, id string) (*graphql.Organization, error) {
	return withTxSingle(ctx, r, func(ctx context.Context) (*model.Organization, error) {
		return r.svc.Get(ctx, id)
	})
}

func (r *Resolver) CreateOrganization(ctx context.Context, input graphql.CreateOrganizationInput) (*graphql.Organization, error) {
	return withTxSingle(ctx, r, func(ctx context.Context) (*model.Organization, error) {
		return r.svc.Create(ctx, model.CreateOrganizationInput{Name: input.Name})
	})
}

func (r *Resolver) RenameOrganization(ctx context.Context, id string, name string) (*graphql.Organization, error) {
	return withTxSingle(ctx, r, func(ctx context.Context) (*model.Organization, error) {
		return r.svc.Rename(ctx, id, name)
	})
}

func (r *Resolver) DeleteOrganization(ctx context.Context, id string) (string, error) {
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

func (r *Resolver) AddOrganizationMember(ctx context.Context, organizationID string, userID string, role graphql.Role) (*graphql.Organization, error) {
	return withTxSingle(ctx, r, func(ctx context.Context) (*model.Organization, error) {
		return r.svc.AddMember(ctx, model.AddOrganizationMemberInput{
			OrganizationID: organizationID,
			UserID:         userID,
			Role:           model.Role(role),
		})
	})
}

func (r *Resolver) UpdateOrganizationMemberRole(ctx context.Context, organizationID string, userID string, role graphql.Role) (*graphql.Organization, error) {
	return withTxSingle(ctx, r, func(ctx context.Context) (*model.Organization, error) {
		return r.svc.UpdateMemberRole(ctx, organizationID, userID, model.Role(role))
	})
}

func (r *Resolver) RemoveOrganizationMember(ctx context.Context, organizationID string, userID string) (*graphql.Organization, error) {
	return withTxSingle(ctx, r, func(ctx context.Context) (*model.Organization, error) {
		return r.svc.RemoveMember(ctx, organizationID, userID)
	})
}

// ---- tx helpers ----

func (r *Resolver) withTx(ctx context.Context, fn func(ctx context.Context) ([]*graphql.Organization, error)) ([]*graphql.Organization, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	res, err := fn(ctx)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return res, nil
}

func withTxSingle(ctx context.Context, r *Resolver, fn func(ctx context.Context) (*model.Organization, error)) (*graphql.Organization, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	org, err := fn(ctx)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return r.conv.ToGraphQL(org), nil
}
