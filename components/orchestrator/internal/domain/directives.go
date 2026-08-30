package domain

import (
	"context"

	gqlgen "github.com/99designs/gqlgen/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/user"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

// NewHasRoleDirective returns a gqlgen directive that enforces a minimum role
// on the authenticated user. The user is loaded into the context by the auth
// middleware under user.UserContextKey. Roles are hierarchical
// (ADMIN > OPERATOR > VIEWER); a user satisfies the directive when their role
// is at least the required minimum.
func NewHasRoleDirective() func(ctx context.Context, obj any, next gqlgen.Resolver, minimum graphql.Role) (any, error) {
	return func(ctx context.Context, obj any, next gqlgen.Resolver, minimum graphql.Role) (any, error) {
		u, ok := ctx.Value(user.UserContextKey).(*model.User)
		if !ok || u == nil {
			return nil, apperrors.NewUnauthorizedError("authentication required")
		}

		if !u.Role.AtLeast(model.Role(minimum)) {
			return nil, apperrors.NewUnauthorizedError("insufficient role: requires at least " + string(minimum))
		}

		return next(ctx)
	}
}
