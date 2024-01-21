package widget

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/model"
	"github.com/iot-proj/components/orchestrator/internal/repo"
	"github.com/iot-proj/components/orchestrator/pkg/resource"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
	"time"
)

const tableName string = `public.widgets`

var (
	updatableTableColumns = []string{"name", "description", "tenant_id", "status", "device_ids", "created_at", "updated_at"}
	idTableColumns        = []string{"id"}
	tableColumns          = append(idTableColumns, updatableTableColumns...)
)

type EntityConverter interface {
	ToEntity(model model.Widget) (*Entity, error)
	FromEntity(entity *Entity) (*model.Widget, error)
}

type repository struct {
	creator      repo.CreatorGlobal
	singleGetter repo.SingleGetter
	deleter      repo.Deleter
	lister       repo.Lister
	conv         EntityConverter
}

func NewRepository(converter EntityConverter) *repository {
	return &repository{
		creator:      repo.NewCreatorGlobal(resource.Widget, tableName, tableColumns),
		singleGetter: repo.NewSingleGetter(tableName, tableColumns),
		deleter:      repo.NewDeleter(tableName),
		lister:       repo.NewLister(tableName, tableColumns),
		conv:         converter,
	}
}

// Create missing godoc
func (r *repository) Create(ctx context.Context, item model.Widget) error {
	log.C(ctx).Infof("Converting Widget with id %s to entity", item.ID)
	entity, err := r.conv.ToEntity(item)
	if err != nil {
		return err
	}

	now := time.Now()
	entity.CreatedAt = &now
	entity.UpdatedAt = &now

	log.C(ctx).Debugf("Persisting Widget entity with id %s to db", item.ID)
	return r.creator.Create(ctx, entity)
}

// Get missing godoc
func (r *repository) Get(ctx context.Context, id, tnt string) (*model.Widget, error) {
	var entity Entity
	if err := r.singleGetter.Get(ctx, resource.Widget, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	result, err := r.conv.FromEntity(&entity)
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

	return r.multipleFromEntities(entities)
}

// ListAll missing godoc
func (r *repository) ListAll(ctx context.Context, tenantID string) ([]*model.Widget, error) {
	var entities EntityCollection

	err := r.lister.List(ctx, resource.Widget, tenantID, &entities)

	if err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

// Delete missing godoc
func (r *repository) Delete(ctx context.Context, id, tenantID string) error {
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
