package repo

import (
	"context"
	"fmt"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"strings"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

// Creator is an interface for creating entities with externally managed tenant accesses (m2m table or view)
type Creator interface {
	Create(ctx context.Context, resourceType resource.Type, dbEntity interface{}) error
}

// CreatorGlobal is an interface for creating global entities without tenant or entities with tenant embedded in them.
type CreatorGlobal interface {
	Create(ctx context.Context, dbEntity interface{}) error
}

type universalCreator struct {
	tableName          string
	columns            []string
	matcherColumns     []string
	ownerCheckRequired bool
}

// NewCreator is a constructor for Creator about entities with externally managed tenant accesses (m2m table or view)
func NewCreator(tableName string, columns []string) Creator {
	return &universalCreator{
		tableName:          tableName,
		columns:            columns,
		ownerCheckRequired: true,
	}
}

// NewCreatorGlobal is a constructor for GlobalCreator about entities without tenant or entities with tenant embedded in them.
func NewCreatorGlobal(resourceType resource.Type, tableName string, columns []string) CreatorGlobal {
	return &globalCreator{
		resourceType: resourceType,
		tableName:    tableName,
		columns:      columns,
	}
}

// Create is a method for creating entities with externally managed tenant accesses (m2m table or view)
// In case of top level entity it creates tenant access record in the m2m table as well.
// In case of child entity first it checks if the calling tenant has access to the parent entity and then creates the child entity.
func (c *universalCreator) Create(ctx context.Context, resourceType resource.Type, dbEntity interface{}) error {
	if dbEntity == nil {
		return apperrors.NewInternalError("item cannot be nil")
	}

	var id string
	if identifiable, ok := dbEntity.(Identifiable); ok {
		id = identifiable.GetID()
	}

	if len(id) == 0 {
		return apperrors.NewInternalError("id cannot be empty, check if the entity implements Identifiable")
	}

	return c.createChildEntity(ctx, dbEntity, resourceType)
}

func (c *universalCreator) createChildEntity(ctx context.Context, dbEntity interface{}, resourceType resource.Type) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	values := make([]string, 0, len(c.columns))
	for _, c := range c.columns {
		values = append(values, fmt.Sprintf(":%s", c))
	}

	insertStmt := fmt.Sprintf("INSERT INTO %s ( %s ) VALUES ( %s )", c.tableName, strings.Join(c.columns, ", "), strings.Join(values, ", "))

	logger.C(ctx).Debugf("Executing DB query: %s", insertStmt)
	_, err = persist.NamedExecContext(ctx, insertStmt, dbEntity)

	return persistence.MapSQLError(ctx, err, resourceType, resource.Create, "while inserting row to '%s' table", c.tableName)
}

type globalCreator struct {
	tableName    string
	resourceType resource.Type
	columns      []string
}

// Create creates a new global entity or entity with embedded tenant in it.
func (c *globalCreator) Create(ctx context.Context, dbEntity interface{}) error {
	if dbEntity == nil {
		return apperrors.NewInternalError("item cannot be nil")
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	values := make([]string, 0, len(c.columns))
	for _, c := range c.columns {
		values = append(values, fmt.Sprintf(":%s", c))
	}

	stmt := fmt.Sprintf("INSERT INTO %s ( %s ) VALUES ( %s )", c.tableName, strings.Join(c.columns, ", "), strings.Join(values, ", "))

	logger.C(ctx).Debugf("Executing DB query: %s with %+v", stmt, dbEntity)
	_, err = persist.NamedExecContext(ctx, stmt, dbEntity)

	return persistence.MapSQLError(ctx, err, c.resourceType, resource.Create, "while inserting row to '%s' table", c.tableName)
}
