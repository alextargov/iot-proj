package dashboard_layout

import (
	"context"
	"fmt"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName    string = `public.dashboard_layouts`
	tenantColumn string = `tenant_id`
)

var columns = []string{"id", "tenant_id", "name", "description", "is_default", "refresh_interval_seconds", "created_at", "updated_at"}

type EntityConverter interface {
	ToEntity(model model.DashboardLayout) (*Entity, error)
	FromEntity(entity *Entity) (*model.DashboardLayout, error)
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
		creator:      repo.NewCreatorGlobal(resource.DashboardLayout, tableName, columns),
		singleGetter: repo.NewSingleGetterWithEmbeddedTenant(tableName, tenantColumn, columns),
		lister:       repo.NewListerWithEmbeddedTenant(tableName, tenantColumn, columns),
		deleter:      repo.NewDeleter(tableName),
		updater:      repo.NewUpdaterGlobal(resource.DashboardLayout, tableName, []string{"name", "description", "is_default", "refresh_interval_seconds", "updated_at"}, []string{"id"}),
		conv:         converter,
	}
}

func (r *Repository) Create(ctx context.Context, item model.DashboardLayout) error {
	logger.C(ctx).Debugf("Creating dashboard layout with id %s", item.ID)
	entity, err := r.conv.ToEntity(item)
	if err != nil {
		return err
	}

	now := time.Now()
	entity.CreatedAt = &now

	return r.creator.Create(ctx, entity)
}

func (r *Repository) Get(ctx context.Context, id, tenantID string) (*model.DashboardLayout, error) {
	var entity Entity
	if err := r.singleGetter.Get(ctx, resource.DashboardLayout, tenantID, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	return r.conv.FromEntity(&entity)
}

func (r *Repository) GetDefault(ctx context.Context, tenantID string) (*model.DashboardLayout, error) {
	var entities EntityCollection
	if err := r.lister.List(ctx, resource.DashboardLayout, tenantID, &entities, repo.NewEqualCondition("is_default", true)); err != nil {
		return nil, err
	}

	if len(entities) == 0 {
		return nil, nil
	}

	return r.conv.FromEntity(&entities[0])
}

func (r *Repository) List(ctx context.Context, tenantID string) ([]*model.DashboardLayout, error) {
	var entities EntityCollection
	if err := r.lister.List(ctx, resource.DashboardLayout, tenantID, &entities); err != nil {
		return nil, err
	}

	layouts := make([]*model.DashboardLayout, 0, len(entities))
	for _, e := range entities {
		layout, err := r.conv.FromEntity(&e)
		if err != nil {
			return nil, err
		}
		layouts = append(layouts, layout)
	}

	return layouts, nil
}

func (r *Repository) Update(ctx context.Context, layout *model.DashboardLayout) error {
	now := time.Now()
	entity, err := r.conv.ToEntity(*layout)
	if err != nil {
		return err
	}
	entity.UpdatedAt.Time = now
	entity.UpdatedAt.Valid = true

	return r.updater.UpdateSingleGlobal(ctx, entity)
}

func (r *Repository) Delete(ctx context.Context, id, tenantID string) error {
	return r.deleter.DeleteOne(ctx, resource.DashboardLayout, tenantID, repo.Conditions{repo.NewEqualCondition("id", id)})
}

func (r *Repository) ClearDefaults(ctx context.Context, tenantID string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	query := fmt.Sprintf("UPDATE %s SET is_default = false WHERE tenant_id = $1 AND is_default = true", tableName)
	_, err = persist.ExecContext(ctx, query, tenantID)
	return err
}
