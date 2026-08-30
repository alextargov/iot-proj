package auth

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/user"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/transaction"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// AuthService is the auth business logic the resolver delegates to.
type AuthService interface {
	UpdateRole(ctx context.Context, userID string, role model.Role) (*model.User, error)
}

// Resolver handles GraphQL auth/user-management operations.
type Resolver struct {
	transact persistence.Transactioner
	authSvc  AuthService
}

// NewResolver creates a new auth resolver.
func NewResolver(transact persistence.Transactioner, authSvc AuthService) *Resolver {
	return &Resolver{
		transact: transact,
		authSvc:  authSvc,
	}
}

// UpdateUserRole assigns a new role to a user. Admin-only, enforced by the
// @hasRole directive on the schema field.
func (r *Resolver) UpdateUserRole(ctx context.Context, userID string, role graphql.Role) (*graphql.User, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (*graphql.User, error) {
		updated, err := r.authSvc.UpdateRole(ctx, userID, model.Role(role))
		if err != nil {
			return nil, err
		}
		return user.ToGraphQL(updated), nil
	})
}
