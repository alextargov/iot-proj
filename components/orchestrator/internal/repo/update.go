package repo

import (
	"context"
	"fmt"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"strings"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"

	"github.com/pkg/errors"
)

// UpdaterGlobal is an interface for updating global entities without tenant or entities with tenant embedded in them.
type UpdaterGlobal interface {
	UpdateSingleGlobal(ctx context.Context, dbEntity interface{}) error
	UpdateSingleWithVersionGlobal(ctx context.Context, dbEntity interface{}) error
	SetIDColumns(idColumns []string)
	SetUpdatableColumns(updatableColumns []string)
	Clone() UpdaterGlobal
}

// Updater is an interface for updating entities with externally managed tenant accesses (m2m table or view)
type Updater interface {
	UpdateSingle(ctx context.Context, resourceType resource.Type, tenant string, dbEntity interface{}) error
	UpdateSingleWithVersion(ctx context.Context, resourceType resource.Type, tenant string, dbEntity interface{}) error
}

type updater struct {
	tableName        string
	updatableColumns []string
	idColumns        []string
}

type updaterGlobal struct {
	tableName        string
	resourceType     resource.Type
	tenantColumn     *string
	updatableColumns []string
	idColumns        []string
}

// NewUpdater is a constructor for Updater about entities with externally managed tenant accesses (m2m table or view)
func NewUpdater(tableName string, updatableColumns []string, idColumns []string) Updater {
	return &updater{
		tableName:        tableName,
		updatableColumns: updatableColumns,
		idColumns:        idColumns,
	}
}

// NewUpdaterGlobal is a constructor for UpdaterGlobal about global entities without tenant.
func NewUpdaterGlobal(resourceType resource.Type, tableName string, updatableColumns []string, idColumns []string) UpdaterGlobal {
	return &updaterGlobal{
		resourceType:     resourceType,
		tableName:        tableName,
		updatableColumns: updatableColumns,
		idColumns:        idColumns,
	}
}

// NewUpdaterWithEmbeddedTenant is a constructor for UpdaterGlobal about entities with tenant embedded in them.
func NewUpdaterWithEmbeddedTenant(resourceType resource.Type, tableName string, updatableColumns []string, tenantColumn string, idColumns []string) UpdaterGlobal {
	return &updaterGlobal{
		resourceType:     resourceType,
		tableName:        tableName,
		updatableColumns: updatableColumns,
		tenantColumn:     &tenantColumn,
		idColumns:        idColumns,
	}
}

// UpdateSingleWithVersion updates the entity while checking its version as a way of optimistic locking.
// It is suitable for entities with externally managed tenant accesses (m2m table or view).
//
// UpdateSingleWithVersion performs get of the resource with owner check before updating the entity with version.
// This is needed in order to distinguish the generic Unauthorized error due to the tenant has no owner access to the entity
// and the case of concurrent modification where the version differs. In both cases the affected rows would be 0.
func (u *updater) UpdateSingleWithVersion(ctx context.Context, resourceType resource.Type, tenant string, dbEntity interface{}) error {
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

	exister := NewExistQuerierWithOwnerCheck(u.tableName)
	found, err := exister.Exists(ctx, resourceType, tenant, Conditions{NewEqualCondition("id", id)})
	if err != nil {
		return err
	}
	if !found {
		return apperrors.NewInvalidOperationError("entity does not exist or caller tenant does not have owner access")
	}

	return u.updateSingleWithVersion(ctx, tenant, dbEntity, resourceType)
}

// UpdateSingle updates the given entity if the tenant has owner access to it.
// It is suitable for entities with externally managed tenant accesses (m2m table or view).
func (u *updater) UpdateSingle(ctx context.Context, resourceType resource.Type, tenant string, dbEntity interface{}) error {
	return u.updateSingleWithFields(ctx, dbEntity, tenant, buildFieldsToSet(u.updatableColumns), resourceType)
}

func (u *updater) updateSingleWithVersion(ctx context.Context, tenant string, dbEntity interface{}, resourceType resource.Type) error {
	fieldsToSet := buildFieldsToSet(u.updatableColumns)
	fieldsToSet = append(fieldsToSet, "version = version+1")

	if err := u.updateSingleWithFields(ctx, dbEntity, tenant, fieldsToSet, resourceType); err != nil {
		if apperrors.IsConcurrentUpdate(err) {
			return apperrors.NewConcurrentUpdate()
		}
		return err
	}
	return nil
}

func (u *updater) updateSingleWithFields(ctx context.Context, dbEntity interface{}, tenant string, fieldsToSet []string, resourceType resource.Type) error {
	if dbEntity == nil {
		return apperrors.NewInternalError("item cannot be nil")
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	query, err := u.buildQuery(fieldsToSet)
	if err != nil {
		return err
	}

	if entityWithExternalTenant, ok := dbEntity.(EntityWithExternalTenant); ok {
		dbEntity = entityWithExternalTenant.DecorateWithTenantID(tenant)
	}

	logger.C(ctx).Debugf("Executing DB query: %s", query)
	res, err := persist.NamedExecContext(ctx, query, dbEntity)
	if err = persistence.MapSQLError(ctx, err, resourceType, resource.Update, "while updating single entity from '%s' table", u.tableName); err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "while checking affected rows")
	}

	return assertSingleRowAffected(resourceType, affected, true)
}

func (u *updater) buildQuery(fieldsToSet []string) (string, error) {
	var stmtBuilder strings.Builder
	stmtBuilder.WriteString(fmt.Sprintf("UPDATE %s SET %s WHERE", u.tableName, strings.Join(fieldsToSet, ", ")))
	if len(u.idColumns) > 0 {
		var preparedIDColumns []string
		for _, idCol := range u.idColumns {
			preparedIDColumns = append(preparedIDColumns, fmt.Sprintf("%s = :%s", idCol, idCol))
		}
		stmtBuilder.WriteString(fmt.Sprintf(" %s", strings.Join(preparedIDColumns, " AND ")))
		stmtBuilder.WriteString(" AND")
	}

	return stmtBuilder.String(), nil
}

// UpdateSingleGlobal updates the given entity. In case of configured tenant column it checks if it matches the tenant inside the dbEntity.
// It is suitable for entities without tenant or entities with tenant embedded in them.
func (u *updaterGlobal) UpdateSingleGlobal(ctx context.Context, dbEntity interface{}) error {
	return u.updateSingleWithFields(ctx, dbEntity, buildFieldsToSet(u.updatableColumns))
}

// UpdateSingleWithVersionGlobal updates the entity while checking its version as a way of optimistic locking.
// In case of configured tenant column it checks if it matches the tenant inside the dbEntity.
// It is suitable for entities without tenant or entities with tenant embedded in them.
func (u *updaterGlobal) UpdateSingleWithVersionGlobal(ctx context.Context, dbEntity interface{}) error {
	return u.updateSingleWithVersion(ctx, dbEntity)
}

// SetIDColumns is a setter for idColumns.
func (u *updaterGlobal) SetIDColumns(idColumns []string) {
	u.idColumns = idColumns
}

// SetUpdatableColumns is a setter for updatableColumns.
func (u *updaterGlobal) SetUpdatableColumns(updatableColumns []string) {
	u.updatableColumns = updatableColumns
}

// Clone clones the updater.
func (u *updaterGlobal) Clone() UpdaterGlobal {
	var clonedUpdater updaterGlobal

	clonedUpdater.tableName = u.tableName
	clonedUpdater.resourceType = u.resourceType
	clonedUpdater.updatableColumns = append(clonedUpdater.updatableColumns, u.updatableColumns...)
	clonedUpdater.tenantColumn = u.tenantColumn
	clonedUpdater.idColumns = append(clonedUpdater.idColumns, u.idColumns...)

	return &clonedUpdater
}

func (u *updaterGlobal) updateSingleWithVersion(ctx context.Context, dbEntity interface{}) error {
	fieldsToSet := buildFieldsToSet(u.updatableColumns)
	fieldsToSet = append(fieldsToSet, "version = version+1")

	if err := u.updateSingleWithFields(ctx, dbEntity, fieldsToSet); err != nil {
		if apperrors.IsConcurrentUpdate(err) {
			return apperrors.NewConcurrentUpdate()
		}
		return err
	}
	return nil
}

func (u *updaterGlobal) updateSingleWithFields(ctx context.Context, dbEntity interface{}, fieldsToSet []string) error {
	if dbEntity == nil {
		return apperrors.NewInternalError("item cannot be nil")
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	query := u.buildQuery(fieldsToSet)

	logger.C(ctx).Debugf("Executing DB query: %s", query)
	res, err := persist.NamedExecContext(ctx, query, dbEntity)
	if err = persistence.MapSQLError(ctx, err, u.resourceType, resource.Update, "while updating single entity from '%s' table", u.tableName); err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "while checking affected rows")
	}

	isTenantScopedUpdate := u.tenantColumn != nil

	return assertSingleRowAffected(u.resourceType, affected, isTenantScopedUpdate)
}

func (u *updaterGlobal) buildQuery(fieldsToSet []string) string {
	var stmtBuilder strings.Builder
	stmtBuilder.WriteString(fmt.Sprintf("UPDATE %s SET %s WHERE", u.tableName, strings.Join(fieldsToSet, ", ")))
	if len(u.idColumns) > 0 {
		var preparedIDColumns []string
		for _, idCol := range u.idColumns {
			preparedIDColumns = append(preparedIDColumns, fmt.Sprintf("%s = :%s", idCol, idCol))
		}
		stmtBuilder.WriteString(fmt.Sprintf(" %s", strings.Join(preparedIDColumns, " AND ")))
		if u.tenantColumn != nil {
			stmtBuilder.WriteString(" AND")
		}
	}

	if u.tenantColumn != nil {
		stmtBuilder.WriteString(fmt.Sprintf(" %s = :%s", *u.tenantColumn, *u.tenantColumn))
	}

	return stmtBuilder.String()
}

func buildFieldsToSet(updatableColumns []string) []string {
	fieldsToSet := make([]string, 0, len(updatableColumns)+1)
	for _, c := range updatableColumns {
		fieldsToSet = append(fieldsToSet, fmt.Sprintf("%s = :%s", c, c))
	}
	return fieldsToSet
}

func assertSingleRowAffected(resourceType resource.Type, affected int64, isTenantScopedUpdate bool) error {
	if affected == 0 && isTenantScopedUpdate {
		return apperrors.NewUnauthorizedError(apperrors.ShouldBeOwnerMsg)
	}

	if affected != 1 {
		return apperrors.NewInternalError(apperrors.ShouldUpdateSingleRowButUpdatedMsgF, affected)
	}
	return nil
}
