package user

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// UserContextKey is the context key for storing the authenticated user
const UserContextKey = "user"

// UserLister lists all users (admin surface).
type UserLister interface {
	List(ctx context.Context) ([]*model.User, error)
}

// Resolver handles GraphQL operations for users
type Resolver struct {
	transact persistence.Transactioner
	svc      UserLister
}

// NewResolver creates a new user resolver. transact/svc may be nil for the
// context-only Me query; they are required for the admin Users query.
func NewResolver(transact persistence.Transactioner, svc UserLister) *Resolver {
	return &Resolver{transact: transact, svc: svc}
}

// Me returns the currently authenticated user from context
func (r *Resolver) Me(ctx context.Context) (*graphql.User, error) {
	user, ok := ctx.Value(UserContextKey).(*model.User)
	if !ok || user == nil {
		return nil, nil // Return nil if no user in context (unauthenticated)
	}

	return ToGraphQL(user), nil
}

// Users lists all users (admin-only, enforced by @hasRole in the schema).
func (r *Resolver) Users(ctx context.Context) ([]*graphql.User, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	users, err := r.svc.List(ctx)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	out := make([]*graphql.User, 0, len(users))
	for _, u := range users {
		out = append(out, ToGraphQL(u))
	}
	return out, nil
}

// ToGraphQL converts a model.User to graphql.User
func ToGraphQL(u *model.User) *graphql.User {
	if u == nil {
		return nil
	}

	var createdAt, updatedAt *graphql.Timestamp
	if u.CreatedAt != nil {
		ts := graphql.Timestamp(*u.CreatedAt)
		createdAt = &ts
	}
	if u.UpdatedAt != nil {
		ts := graphql.Timestamp(*u.UpdatedAt)
		updatedAt = &ts
	}

	return &graphql.User{
		ID:        u.ID,
		Username:  u.Username,
		Role:      graphql.Role(u.Role),
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}
}
