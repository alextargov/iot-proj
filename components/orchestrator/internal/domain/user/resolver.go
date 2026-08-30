package user

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

// UserContextKey is the context key for storing the authenticated user
const UserContextKey = "user"

// Resolver handles GraphQL operations for users
type Resolver struct{}

// NewResolver creates a new user resolver
func NewResolver() *Resolver {
	return &Resolver{}
}

// Me returns the currently authenticated user from context
func (r *Resolver) Me(ctx context.Context) (*graphql.User, error) {
	user, ok := ctx.Value(UserContextKey).(*model.User)
	if !ok || user == nil {
		return nil, nil // Return nil if no user in context (unauthenticated)
	}

	return ToGraphQL(user), nil
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
