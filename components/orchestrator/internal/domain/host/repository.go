package host

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/model"
	"github.com/iot-proj/components/orchestrator/internal/repo"
	"github.com/iot-proj/components/orchestrator/pkg/resource"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
)

const tableName string = `public.hosts`

var (
	deviceIDColumn        = "device_id"
	updatableTableColumns = []string{"url", "turn_on_endpoint", "turn_off_endpoint", deviceIDColumn}
	idTableColumns        = []string{"id"}
	tableColumns          = append(idTableColumns, updatableTableColumns...)
)

type EntityConverter interface {
	FromEntity(entity *Entity) *model.Host
	ToEntity(host model.Host) *Entity
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

func (r *repository) GetByDeviceID(ctx context.Context, id, tnt string) (*model.Host, error) {
	var entity Entity
	if err := r.singleGetter.Get(ctx, resource.Device, tnt, repo.Conditions{repo.NewEqualCondition("device_id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	result := r.conv.FromEntity(&entity)

	return result, nil
}

func (r *repository) CreateForDevice(ctx context.Context, item model.Host) error {
	log.C(ctx).Debugf("Converting host with id %s to entity", item.ID)
	entity := r.conv.ToEntity(item)

	log.C(ctx).Debugf("Persisting Host entity with id %s to db", item.ID)
	return r.creator.Create(ctx, entity)
}

func (r *repository) DeleteAllForDevice(ctx context.Context, id string) error {
	return r.deleterGlobal.DeleteManyGlobal(ctx, repo.Conditions{repo.NewEqualCondition(deviceIDColumn, id)})
}
