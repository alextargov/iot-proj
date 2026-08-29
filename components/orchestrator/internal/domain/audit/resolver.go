package audit

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// AuditService defines the interface for audit service
type AuditService interface {
	ListByTenant(ctx context.Context, tenantID string, first int, afterCursor string) ([]*model.AuditLog, int, error)
	ListByResource(ctx context.Context, tenantID, resourceType, resourceID string, first int) ([]*model.AuditLog, error)
}

// Resolver handles GraphQL operations for audit logs
type Resolver struct {
	transact persistence.Transactioner
	svc      AuditService
	conv     *Converter
}

// NewResolver creates a new audit resolver
func NewResolver(transact persistence.Transactioner, svc AuditService, conv *Converter) *Resolver {
	return &Resolver{
		transact: transact,
		svc:      svc,
		conv:     conv,
	}
}

// AuditLogs returns paginated audit logs for the current tenant
func (r *Resolver) AuditLogs(ctx context.Context, first *int, after *string) (*graphql.AuditLogPage, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	pageSize := 50
	if first != nil {
		pageSize = *first
	}

	afterCursor := ""
	if after != nil {
		afterCursor = *after
	}

	logs, totalCount, err := r.svc.ListByTenant(ctx, tnt, pageSize, afterCursor)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	gqlLogs := r.conv.MultipleToGraphQL(logs)

	// Build page info
	var startCursor, endCursor string
	hasNextPage := len(logs) == pageSize && totalCount > pageSize

	if len(logs) > 0 {
		startCursor = logs[0].ID
		endCursor = logs[len(logs)-1].ID
	}

	return &graphql.AuditLogPage{
		Data: gqlLogs,
		PageInfo: &graphql.PageInfo{
			StartCursor: startCursor,
			EndCursor:   endCursor,
			HasNextPage: hasNextPage,
		},
		TotalCount: totalCount,
	}, nil
}

// AuditLogsForResource returns audit logs for a specific resource
func (r *Resolver) AuditLogsForResource(ctx context.Context, resourceType string, resourceID string, first *int) ([]*graphql.AuditLog, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	pageSize := 20
	if first != nil {
		pageSize = *first
	}

	logs, err := r.svc.ListByResource(ctx, tnt, resourceType, resourceID, pageSize)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.conv.MultipleToGraphQL(logs), nil
}
