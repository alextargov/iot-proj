package integration

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName    = "public.integrations"
	tenantColumn = "tenant_id"
)

var (
	tableColumns          = []string{"id", "tenant_id", "name", "type", "endpoint", "auth_token", "config", "enabled", "created_at", "updated_at"}
	updatableTableColumns = []string{"name", "endpoint", "auth_token", "config", "enabled", "updated_at"}
)

// EntityConverter defines the entity conversions the repository needs.
type EntityConverter interface {
	ToEntity(m model.Integration) *Entity
	FromEntity(entity *Entity) *model.Integration
	MultipleFromEntity(entities EntityCollection) []*model.Integration
}

type repository struct {
	creator repo.Creator
	lister  repo.Lister
	getter  repo.SingleGetter
	updater repo.Updater
	deleter repo.Deleter
	conv    EntityConverter
}

// NewRepository creates a new integration repository.
func NewRepository(conv EntityConverter) *repository {
	return &repository{
		creator: repo.NewCreator(tableName, tableColumns),
		lister:  repo.NewListerWithEmbeddedTenant(tableName, tenantColumn, tableColumns),
		getter:  repo.NewSingleGetterWithEmbeddedTenant(tableName, tenantColumn, tableColumns),
		updater: repo.NewUpdater(tableName, updatableTableColumns, []string{"id"}),
		deleter: repo.NewDeleter(tableName),
		conv:    conv,
	}
}

func (r *repository) Create(ctx context.Context, m model.Integration) error {
	entity := r.conv.ToEntity(m)
	now := time.Now()
	entity.CreatedAt = &now
	return r.creator.Create(ctx, resource.Integration, entity)
}

func (r *repository) List(ctx context.Context) ([]*model.Integration, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var entities EntityCollection
	if err := r.lister.List(ctx, resource.Integration, tnt, &entities); err != nil {
		return nil, err
	}
	return r.conv.MultipleFromEntity(entities), nil
}

func (r *repository) Get(ctx context.Context, id string) (*model.Integration, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var entity Entity
	if err := r.getter.Get(ctx, resource.Integration, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}
	return r.conv.FromEntity(&entity), nil
}

func (r *repository) Update(ctx context.Context, m model.Integration) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}
	now := time.Now()
	entity := r.conv.ToEntity(m)
	entity.UpdatedAt.Time = now
	entity.UpdatedAt.Valid = true
	return r.updater.UpdateSingle(ctx, resource.Integration, tnt, entity)
}

func (r *repository) Delete(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}
	return r.deleter.DeleteOne(ctx, resource.Integration, tnt, repo.Conditions{repo.NewEqualCondition("id", id)})
}
