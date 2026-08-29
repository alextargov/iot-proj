package audit

import (
	"context"
	"fmt"
	"strings"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName      = "audit_logs"
	tenantIDColumn = "tenant_id"
)

var (
	tableColumns = []string{
		"id", "tenant_id", "user_id", "username", "action",
		"resource_type", "resource_id", "resource_name", "details",
		"ip_address", "user_agent", "status", "error_message", "created_at",
	}
)

// Repository handles audit log database operations
type Repository struct {
	creator repo.CreatorGlobal
	conv    *Converter
}

// NewRepository creates a new audit log repository
func NewRepository(conv *Converter) *Repository {
	return &Repository{
		creator: repo.NewCreatorGlobal(resource.AuditLog, tableName, tableColumns),
		conv:    conv,
	}
}

// Create creates a new audit log entry
func (r *Repository) Create(ctx context.Context, auditLog *model.AuditLog) error {
	entity := r.conv.ToEntity(auditLog)
	return r.creator.Create(ctx, entity)
}

// ListByTenant lists audit logs for a tenant with pagination
func (r *Repository) ListByTenant(ctx context.Context, tenantID string, first int, afterCursor string) ([]*model.AuditLog, int, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s = $1", tableName, tenantIDColumn)
	var totalCount int
	if err := persist.GetContext(ctx, &totalCount, countQuery, tenantID); err != nil {
		return nil, 0, err
	}

	// Build select query with cursor-based pagination
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("%s = $%d", tenantIDColumn, argIdx))
	args = append(args, tenantID)
	argIdx++

	if afterCursor != "" {
		// Use cursor for pagination - get created_at of cursor item
		conditions = append(conditions, fmt.Sprintf("(created_at, id) < (SELECT created_at, id FROM %s WHERE id = $%d)", tableName, argIdx))
		args = append(args, afterCursor)
		argIdx++
	}

	selectQuery := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s ORDER BY created_at DESC, id DESC LIMIT %d",
		strings.Join(tableColumns, ", "),
		tableName,
		strings.Join(conditions, " AND "),
		first,
	)

	logger.C(ctx).Debugf("Executing audit log query: %s", selectQuery)

	var entities EntityCollection
	if err := persist.SelectContext(ctx, &entities, selectQuery, args...); err != nil {
		return nil, 0, err
	}

	result := make([]*model.AuditLog, 0, len(entities))
	for _, entity := range entities {
		result = append(result, r.conv.FromEntity(&entity))
	}

	return result, totalCount, nil
}

// ListByResource lists audit logs for a specific resource
func (r *Repository) ListByResource(ctx context.Context, tenantID, resourceType, resourceID string, first int) ([]*model.AuditLog, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	selectQuery := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s = $1 AND resource_type = $2 AND resource_id = $3 ORDER BY created_at DESC LIMIT %d",
		strings.Join(tableColumns, ", "),
		tableName,
		tenantIDColumn,
		first,
	)

	logger.C(ctx).Debugf("Executing audit log query: %s", selectQuery)

	var entities EntityCollection
	if err := persist.SelectContext(ctx, &entities, selectQuery, tenantID, resourceType, resourceID); err != nil {
		return nil, err
	}

	result := make([]*model.AuditLog, 0, len(entities))
	for _, entity := range entities {
		result = append(result, r.conv.FromEntity(&entity))
	}

	return result, nil
}
