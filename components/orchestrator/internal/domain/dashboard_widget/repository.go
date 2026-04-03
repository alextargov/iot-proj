package dashboard_widget

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName    string = `public.dashboard_widgets`
	tenantColumn string = `tenant_id`
)

var columns = []string{"id", "dashboard_layout_id", "tenant_id", "widget_type", "title", "grid_x", "grid_y", "grid_cols", "grid_rows", "device_id", "metric_name", "config", "created_at", "updated_at"}

type EntityConverter interface {
	ToEntity(model model.DashboardWidget) (*Entity, error)
	FromEntity(entity *Entity) (*model.DashboardWidget, error)
}

type Repository struct {
	creator      repo.CreatorGlobal
	singleGetter repo.SingleGetter
	lister       repo.Lister
	deleter      repo.Deleter
	updater      repo.UpdaterGlobal
	conv         EntityConverter
}

func NewRepository(converter EntityConverter) *Repository {
	return &Repository{
		creator:      repo.NewCreatorGlobal(resource.DashboardWidget, tableName, columns),
		singleGetter: repo.NewSingleGetterWithEmbeddedTenant(tableName, tenantColumn, columns),
		lister:       repo.NewListerWithEmbeddedTenant(tableName, tenantColumn, columns),
		deleter:      repo.NewDeleter(tableName),
		updater:      repo.NewUpdaterGlobal(resource.DashboardWidget, tableName, []string{"title", "grid_x", "grid_y", "grid_cols", "grid_rows", "device_id", "metric_name", "config", "updated_at"}, []string{"id"}),
		conv:         converter,
	}
}

func (r *Repository) Create(ctx context.Context, item model.DashboardWidget) error {
	logger.C(ctx).Debugf("Creating dashboard widget with id %s", item.ID)
	entity, err := r.conv.ToEntity(item)
	if err != nil {
		return err
	}

	now := time.Now()
	entity.CreatedAt = &now

	return r.creator.Create(ctx, entity)
}

func (r *Repository) Get(ctx context.Context, id, tenantID string) (*model.DashboardWidget, error) {
	var entity Entity
	if err := r.singleGetter.Get(ctx, resource.DashboardWidget, tenantID, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	return r.conv.FromEntity(&entity)
}

func (r *Repository) ListByLayoutID(ctx context.Context, layoutID, tenantID string) ([]*model.DashboardWidget, error) {
	var entities EntityCollection
	if err := r.lister.List(ctx, resource.DashboardWidget, tenantID, &entities, repo.NewEqualCondition("dashboard_layout_id", layoutID)); err != nil {
		return nil, err
	}

	widgets := make([]*model.DashboardWidget, 0, len(entities))
	for _, e := range entities {
		widget, err := r.conv.FromEntity(&e)
		if err != nil {
			return nil, err
		}
		widgets = append(widgets, widget)
	}

	return widgets, nil
}

func (r *Repository) Update(ctx context.Context, widget *model.DashboardWidget) error {
	now := time.Now()
	entity, err := r.conv.ToEntity(*widget)
	if err != nil {
		return err
	}
	entity.UpdatedAt.Time = now
	entity.UpdatedAt.Valid = true

	return r.updater.UpdateSingleGlobal(ctx, entity)
}

func (r *Repository) Delete(ctx context.Context, id, tenantID string) error {
	return r.deleter.DeleteOne(ctx, resource.DashboardWidget, tenantID, repo.Conditions{repo.NewEqualCondition("id", id)})
}

func (r *Repository) UpdatePositions(ctx context.Context, positions []model.WidgetPositionInput) error {
	if len(positions) == 0 {
		return nil
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	now := time.Now()

	var values []string
	var args []interface{}
	argIndex := 1

	for _, pos := range positions {
		values = append(values, fmt.Sprintf("($%d::uuid, $%d::integer, $%d::integer, $%d::integer, $%d::integer, $%d::timestamp)",
			argIndex, argIndex+1, argIndex+2, argIndex+3, argIndex+4, argIndex+5))
		args = append(args, pos.WidgetID, pos.GridX, pos.GridY, pos.GridCols, pos.GridRows, now)
		argIndex += 6
	}

	query := fmt.Sprintf(`
		UPDATE %s AS w SET
			grid_x = v.grid_x,
			grid_y = v.grid_y,
			grid_cols = v.grid_cols,
			grid_rows = v.grid_rows,
			updated_at = v.updated_at
		FROM (VALUES %s) AS v(id, grid_x, grid_y, grid_cols, grid_rows, updated_at)
		WHERE w.id = v.id
	`, tableName, strings.Join(values, ", "))

	_, err = persist.ExecContext(ctx, query, args...)
	return err
}
