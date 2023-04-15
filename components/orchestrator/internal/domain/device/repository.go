package device

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/model"
	"github.com/iot-proj/components/orchestrator/internal/repo"
	"github.com/iot-proj/components/orchestrator/pkg/resource"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
)

const tableName string = `public.devices`

var (
	updatableTableColumns = []string{"name", "description", "tenant_id", "status", "auth"}
	idTableColumns        = []string{"id"}
	tableColumns          = append(idTableColumns, updatableTableColumns...)
)

type EntityConverter interface {
	ToEntity(model model.Device) (*Entity, error)
	FromEntity(entity *Entity) (*model.Device, error)
}

type repository struct {
	creator               repo.CreatorGlobal
	existQuerierGlobal    repo.ExistQuerierGlobal
	singleGetter          repo.SingleGetter
	pageableQuerierGlobal repo.PageableQuerierGlobal
	updaterGlobal         repo.UpdaterGlobal
	deleterGlobal         repo.DeleterGlobal
	deleter               repo.Deleter
	listerGlobal          repo.ListerGlobal
	lister                repo.Lister
	conv                  EntityConverter
}

func NewRepository(converter EntityConverter) *repository {
	return &repository{
		creator:               repo.NewCreatorGlobal(resource.Device, tableName, tableColumns),
		existQuerierGlobal:    repo.NewExistQuerierGlobal(resource.Device, tableName),
		singleGetter:          repo.NewSingleGetter(tableName, tableColumns),
		pageableQuerierGlobal: repo.NewPageableQuerierGlobal(resource.Device, tableName, tableColumns),
		updaterGlobal:         repo.NewUpdaterGlobal(resource.Device, tableName, updatableTableColumns, idTableColumns),
		deleterGlobal:         repo.NewDeleterGlobal(resource.Device, tableName),
		deleter:               repo.NewDeleter(tableName),
		listerGlobal:          repo.NewListerGlobal(resource.Device, tableName, tableColumns),
		lister:                repo.NewLister(tableName, tableColumns),
		conv:                  converter,
	}
}

// Create missing godoc
func (r *repository) Create(ctx context.Context, item model.Device) error {
	log.C(ctx).Debugf("Converting Application Template with id %s to entity", item.ID)
	entity, err := r.conv.ToEntity(item)
	if err != nil {
		return err
	}

	log.C(ctx).Debugf("Persisting Application Template entity with id %s to db", item.ID)
	return r.creator.Create(ctx, entity)
}

// Get missing godoc
func (r *repository) Get(ctx context.Context, id, tnt string) (*model.Device, error) {
	var entity Entity
	if err := r.singleGetter.Get(ctx, resource.Device, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	result, err := r.conv.FromEntity(&entity)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *repository) ListByIDs(ctx context.Context, tenant string, ids []string) ([]*model.Device, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var entities EntityCollection
	if err := r.lister.List(ctx, resource.Device, tenant, &entities, repo.NewInConditionForStringValues("id", ids)); err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

// Exists missing godoc
func (r *repository) Exists(ctx context.Context, id string) (bool, error) {
	return r.existQuerierGlobal.ExistsGlobal(ctx, repo.Conditions{repo.NewEqualCondition("id", id)})
}

// ListAll missing godoc
func (r *repository) ListAll(ctx context.Context, tenantID string) ([]*model.Device, error) {
	var entities EntityCollection

	err := r.lister.List(ctx, resource.Device, tenantID, &entities)

	if err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

// ListAllGlobal missing godoc
func (r *repository) ListAllGlobal(ctx context.Context) ([]*model.Device, error) {
	var entities EntityCollection

	err := r.listerGlobal.ListGlobal(ctx, &entities)

	if err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

// Update missing godoc
func (r *repository) Update(ctx context.Context, model model.Device) error {
	entity, err := r.conv.ToEntity(model)
	if err != nil {
		return err
	}

	return r.updaterGlobal.UpdateSingleGlobal(ctx, entity)
}

// Delete missing godoc
func (r *repository) Delete(ctx context.Context, id, tenantID string) error {
	return r.deleter.DeleteOne(ctx, resource.Device, tenantID, repo.Conditions{repo.NewEqualCondition("id", id)})
}

func (r *repository) multipleFromEntities(entities EntityCollection) ([]*model.Device, error) {
	items := make([]*model.Device, 0, len(entities))
	for _, ent := range entities {
		m, err := r.conv.FromEntity(&ent)
		if err != nil {
			return nil, err
		}

		items = append(items, m)
	}
	return items, nil
}
