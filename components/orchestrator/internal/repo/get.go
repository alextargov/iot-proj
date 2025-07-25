package repo

import (
	"context"
	"strings"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"

	"github.com/pkg/errors"
)

// SingleGetter is an interface for getting tenant scoped entities with either externally managed tenant accesses (m2m table or view) or embedded tenant in them.
type SingleGetter interface {
	Get(ctx context.Context, resourceType resource.Type, tenant string, conditions Conditions, orderByParams OrderByParams, dest interface{}) error
}

// SingleGetterGlobal is an interface for getting global entities.
type SingleGetterGlobal interface {
	GetGlobal(ctx context.Context, conditions Conditions, orderByParams OrderByParams, dest interface{}) error
}

type universalSingleGetter struct {
	tableName       string
	resourceType    resource.Type
	tenantColumn    *string
	selectedColumns string
}

// NewSingleGetterWithEmbeddedTenant is a constructor for SingleGetter about entities with tenant embedded in them.
func NewSingleGetterWithEmbeddedTenant(tableName string, tenantColumn string, selectedColumns []string) SingleGetter {
	return &universalSingleGetter{
		tableName:       tableName,
		tenantColumn:    &tenantColumn,
		selectedColumns: strings.Join(selectedColumns, ", "),
	}
}

// NewSingleGetter is a constructor for SingleGetter about entities with externally managed tenant accesses (m2m table or view)
func NewSingleGetter(tableName string, selectedColumns []string) SingleGetter {
	return &universalSingleGetter{
		tableName:       tableName,
		selectedColumns: strings.Join(selectedColumns, ", "),
	}
}

// NewSingleGetterGlobal is a constructor for SingleGetterGlobal about global entities.
func NewSingleGetterGlobal(resourceType resource.Type, tableName string, selectedColumns []string) SingleGetterGlobal {
	return &universalSingleGetter{
		resourceType:    resourceType,
		tableName:       tableName,
		selectedColumns: strings.Join(selectedColumns, ", "),
	}
}

// Get gets tenant scoped entities with tenant isolation subquery.
func (g *universalSingleGetter) Get(ctx context.Context, resourceType resource.Type, tenant string, conditions Conditions, orderByParams OrderByParams, dest interface{}) error {
	return g.getWithTenantIsolation(ctx, resourceType, tenant, conditions, orderByParams, dest, NoLock)
}

func (g *universalSingleGetter) getWithTenantIsolation(ctx context.Context, resourceType resource.Type, tenant string, conditions Conditions, orderByParams OrderByParams, dest interface{}, lockClause string) error {
	if tenant == "" {
		return apperrors.NewTenantRequiredError()
	}

	if g.tenantColumn != nil {
		conditions = append(Conditions{NewEqualCondition(*g.tenantColumn, tenant)}, conditions...)
		return g.get(ctx, resourceType, conditions, orderByParams, dest, NoLock)
	}

	return g.get(ctx, resourceType, conditions, orderByParams, dest, lockClause)
}

// GetGlobal gets global entities without tenant isolation.
func (g *universalSingleGetter) GetGlobal(ctx context.Context, conditions Conditions, orderByParams OrderByParams, dest interface{}) error {
	return g.get(ctx, g.resourceType, conditions, orderByParams, dest, NoLock)
}

func (g *universalSingleGetter) get(ctx context.Context, resourceType resource.Type, conditions Conditions, orderByParams OrderByParams, dest interface{}, lockClause string) error {
	if dest == nil {
		return apperrors.NewInternalError("item cannot be nil")
	}
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	query, args, err := buildSelectQuery(g.tableName, g.selectedColumns, conditions, orderByParams, lockClause, true)
	if err != nil {
		return errors.Wrap(err, "while building list query")
	}

	logger.C(ctx).Debugf("Executing DB query: %s", query)
	err = persist.GetContext(ctx, dest, query, args...)

	return persistence.MapSQLError(ctx, err, resourceType, resource.Get, "while getting object from '%s' table", g.tableName)
}
