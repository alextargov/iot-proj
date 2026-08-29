package widget

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pagination"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName          string = `public.widgets`
	widgetDevicesTable string = `public.widget_devices`
	tenantColumn       string = `tenant_id`
)

var (
	updatableTableColumns = []string{"name", "description", "tenant_id", "status", "schedule", "last_executed_at", "created_at", "updated_at"}
	idTableColumns        = []string{"id"}
	tableColumns          = append(idTableColumns, updatableTableColumns...)

	widgetDeviceColumns = []string{"id", "widget_id", "device_id", "created_at"}
)

type EntityConverter interface {
	ToEntity(model model.Widget) (*Entity, error)
	FromEntity(entity *Entity) (*model.Widget, error)
	FromEntityWithDeviceIDs(entity *Entity, deviceIDs []string) (*model.Widget, error)
}

type repository struct {
	creator         repo.CreatorGlobal
	singleGetter    repo.SingleGetter
	pageableQuerier repo.PageableQuerier
	deleter         repo.Deleter
	lister          repo.Lister
	listerGlobal    repo.ListerGlobal
	updater         repo.UpdaterGlobal
	conv            EntityConverter
}

func NewRepository(converter EntityConverter) *repository {
	return &repository{
		creator:         repo.NewCreatorGlobal(resource.Widget, tableName, tableColumns),
		singleGetter:    repo.NewSingleGetterWithEmbeddedTenant(tableName, tenantColumn, tableColumns),
		pageableQuerier: repo.NewPageableQuerierWithEmbeddedTenant(tableName, tenantColumn, tableColumns),
		deleter:         repo.NewDeleter(tableName),
		lister:          repo.NewListerWithEmbeddedTenant(tableName, tenantColumn, tableColumns),
		listerGlobal:    repo.NewListerGlobal(resource.Widget, tableName, tableColumns),
		updater:         repo.NewUpdaterGlobal(resource.Widget, tableName, []string{"last_executed_at"}, []string{"id"}),
		conv:            converter,
	}
}

// Create creates a new widget
func (r *repository) Create(ctx context.Context, item model.Widget) error {
	logger.C(ctx).Infof("Converting Widget with id %s to entity", item.ID)
	entity, err := r.conv.ToEntity(item)
	if err != nil {
		return err
	}

	now := time.Now()
	entity.CreatedAt = &now
	entity.UpdatedAt = &now

	logger.C(ctx).Debugf("Persisting Widget entity with id %s to db", item.ID)
	return r.creator.Create(ctx, entity)
}

// SetDeviceIDs sets the device associations for a widget (replaces existing)
func (r *repository) SetDeviceIDs(ctx context.Context, widgetID string, deviceIDs []string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	// Delete existing associations
	deleteQuery := fmt.Sprintf("DELETE FROM %s WHERE widget_id = $1", widgetDevicesTable)
	_, err = persist.ExecContext(ctx, deleteQuery, widgetID)
	if err != nil {
		return fmt.Errorf("while deleting existing widget device associations: %w", err)
	}

	// Insert new associations
	if len(deviceIDs) == 0 {
		return nil
	}

	now := time.Now()
	values := make([]string, 0, len(deviceIDs))
	args := make([]interface{}, 0, len(deviceIDs)*3)

	for i, deviceID := range deviceIDs {
		base := i * 3
		values = append(values, fmt.Sprintf("(gen_random_uuid(), $%d, $%d, $%d)", base+1, base+2, base+3))
		args = append(args, widgetID, deviceID, now)
	}

	insertQuery := fmt.Sprintf("INSERT INTO %s (id, widget_id, device_id, created_at) VALUES %s",
		widgetDevicesTable, strings.Join(values, ", "))

	_, err = persist.ExecContext(ctx, insertQuery, args...)
	if err != nil {
		return fmt.Errorf("while inserting widget device associations: %w", err)
	}

	return nil
}

// GetDeviceIDs returns the device IDs associated with a widget
func (r *repository) GetDeviceIDs(ctx context.Context, widgetID string) ([]string, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf("SELECT device_id FROM %s WHERE widget_id = $1 ORDER BY created_at", widgetDevicesTable)
	var deviceIDs []string
	if err := persist.SelectContext(ctx, &deviceIDs, query, widgetID); err != nil {
		return nil, fmt.Errorf("while querying widget device IDs: %w", err)
	}

	return deviceIDs, nil
}

// GetDeviceIDsMultiple returns the device IDs for multiple widgets in a single query
func (r *repository) GetDeviceIDsMultiple(ctx context.Context, widgetIDs []string) (map[string][]string, error) {
	if len(widgetIDs) == 0 {
		return make(map[string][]string), nil
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	// Build the query with placeholders
	placeholders := make([]string, len(widgetIDs))
	args := make([]interface{}, len(widgetIDs))
	for i, id := range widgetIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf("SELECT widget_id, device_id FROM %s WHERE widget_id IN (%s) ORDER BY widget_id, created_at",
		widgetDevicesTable, strings.Join(placeholders, ", "))

	var rows []struct {
		WidgetID string `db:"widget_id"`
		DeviceID string `db:"device_id"`
	}
	if err := persist.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, fmt.Errorf("while querying widget device IDs: %w", err)
	}

	result := make(map[string][]string)
	// Initialize all widget IDs with empty slices
	for _, wid := range widgetIDs {
		result[wid] = []string{}
	}

	for _, row := range rows {
		result[row.WidgetID] = append(result[row.WidgetID], row.DeviceID)
	}

	return result, nil
}

// Get retrieves a widget by ID
func (r *repository) Get(ctx context.Context, id, tnt string) (*model.Widget, error) {
	var entity Entity
	if err := r.singleGetter.Get(ctx, resource.Widget, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	// Get device IDs from junction table
	deviceIDs, err := r.GetDeviceIDs(ctx, id)
	if err != nil {
		return nil, err
	}

	result, err := r.conv.FromEntityWithDeviceIDs(&entity, deviceIDs)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *repository) ListByIDs(ctx context.Context, tenant string, ids []string) ([]*model.Widget, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var entities EntityCollection
	if err := r.lister.List(ctx, resource.Widget, tenant, &entities, repo.NewInConditionForStringValues("id", ids)); err != nil {
		return nil, err
	}

	return r.multipleFromEntitiesWithDevices(ctx, entities)
}

// ListAll retrieves all widgets for a tenant
func (r *repository) ListAll(ctx context.Context, tenantID string) ([]*model.Widget, error) {
	var entities EntityCollection

	err := r.lister.List(ctx, resource.Widget, tenantID, &entities)
	if err != nil {
		return nil, err
	}

	return r.multipleFromEntitiesWithDevices(ctx, entities)
}

// ListPage returns a page of widgets for the given tenant
func (r *repository) ListPage(ctx context.Context, tenantID string, pageSize int, cursor string) ([]*model.Widget, *pagination.Page, int, error) {
	var entities EntityCollection

	page, totalCount, err := r.pageableQuerier.List(ctx, resource.Widget, tenantID, pageSize, cursor, "created_at", &entities)
	if err != nil {
		return nil, nil, 0, err
	}

	items, err := r.multipleFromEntitiesWithDevices(ctx, entities)
	if err != nil {
		return nil, nil, 0, err
	}

	return items, page, totalCount, nil
}

// Delete removes a widget by ID
func (r *repository) Delete(ctx context.Context, id, tenantID string) error {
	// Note: widget_devices entries are deleted via CASCADE
	return r.deleter.DeleteOne(ctx, resource.Widget, tenantID, repo.Conditions{repo.NewEqualCondition("id", id)})
}

func (r *repository) multipleFromEntities(entities EntityCollection) ([]*model.Widget, error) {
	items := make([]*model.Widget, 0, len(entities))
	for _, ent := range entities {
		m, err := r.conv.FromEntity(&ent)
		if err != nil {
			return nil, err
		}

		items = append(items, m)
	}
	return items, nil
}

func (r *repository) multipleFromEntitiesWithDevices(ctx context.Context, entities EntityCollection) ([]*model.Widget, error) {
	if len(entities) == 0 {
		return []*model.Widget{}, nil
	}

	// Collect all widget IDs
	widgetIDs := make([]string, len(entities))
	for i, ent := range entities {
		widgetIDs[i] = ent.ID
	}

	// Fetch all device IDs in a single query
	deviceIDsMap, err := r.GetDeviceIDsMultiple(ctx, widgetIDs)
	if err != nil {
		return nil, err
	}

	// Convert entities with their device IDs
	items := make([]*model.Widget, 0, len(entities))
	for _, ent := range entities {
		deviceIDs := deviceIDsMap[ent.ID]
		m, err := r.conv.FromEntityWithDeviceIDs(&ent, deviceIDs)
		if err != nil {
			return nil, err
		}
		items = append(items, m)
	}

	return items, nil
}

// GetScheduledWidgets returns all widgets that have a schedule configured
func (r *repository) GetScheduledWidgets(ctx context.Context) ([]*model.Widget, error) {
	var entities EntityCollection

	err := r.listerGlobal.ListGlobal(ctx, &entities, repo.NewNotNullCondition("schedule"))
	if err != nil {
		return nil, err
	}

	return r.multipleFromEntitiesWithDevices(ctx, entities)
}

// UpdateLastExecuted updates the last_executed_at timestamp for a widget
func (r *repository) UpdateLastExecuted(ctx context.Context, id string, timestamp time.Time) error {
	return r.updater.UpdateSingleGlobal(ctx, &Entity{
		ID:             id,
		LastExecutedAt: &timestamp,
	})
}
