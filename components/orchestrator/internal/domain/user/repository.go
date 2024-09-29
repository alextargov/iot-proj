package user

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const tableName string = `public.users`

var (
	updatableTableColumns = []string{"password", "updated_at"}
	idTableColumns        = []string{"id"}
	tableColumns          = append(idTableColumns, "username", "password", "created_at", "updated_at")
)

type EntityConverter interface {
	FromEntity(entity *Entity) *model.User
	ToEntity(host model.User) *Entity
}

type repository struct {
	creator            repo.CreatorGlobal
	existQuerierGlobal repo.ExistQuerierGlobal
	singleGetterGlobal repo.SingleGetterGlobal
	updaterGlobal      repo.UpdaterGlobal
	deleterGlobal      repo.DeleterGlobal
	deleter            repo.Deleter
	listerGlobal       repo.ListerGlobal
	lister             repo.Lister
	conv               EntityConverter
}

func NewRepository(converter EntityConverter) *repository {
	return &repository{
		creator:            repo.NewCreatorGlobal(resource.User, tableName, tableColumns),
		existQuerierGlobal: repo.NewExistQuerierGlobal(resource.User, tableName),
		singleGetterGlobal: repo.NewSingleGetterGlobal(resource.User, tableName, tableColumns),
		updaterGlobal:      repo.NewUpdaterGlobal(resource.User, tableName, updatableTableColumns, idTableColumns),
		deleterGlobal:      repo.NewDeleterGlobal(resource.User, tableName),
		deleter:            repo.NewDeleter(tableName),
		listerGlobal:       repo.NewListerGlobal(resource.User, tableName, tableColumns),
		lister:             repo.NewLister(tableName, tableColumns),
		conv:               converter,
	}
}

func (r *repository) GetByID(ctx context.Context, id string) (*model.User, error) {
	var entity Entity
	logger.C(ctx).Debugf("Getting a user by ID %s", id)
	if err := r.singleGetterGlobal.GetGlobal(ctx, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	result := r.conv.FromEntity(&entity)

	return result, nil
}

func (r *repository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var entity Entity
	logger.C(ctx).Debugf("Getting a user by username %s", username)
	if err := r.singleGetterGlobal.GetGlobal(ctx, repo.Conditions{repo.NewEqualCondition("username", username)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	result := r.conv.FromEntity(&entity)

	return result, nil
}

func (r *repository) Exists(ctx context.Context, username string) (bool, error) {
	logger.C(ctx).Debugf("Exists a user by username %s", username)

	return r.existQuerierGlobal.ExistsGlobal(ctx, repo.Conditions{repo.NewEqualCondition("username", username)})
}

func (r *repository) Create(ctx context.Context, item model.User) error {
	logger.C(ctx).Debugf("Converting user with id %s to entity", item.ID)
	entity := r.conv.ToEntity(item)

	logger.C(ctx).Debugf("Persisting User entity with id %s to db", item.ID)
	return r.creator.Create(ctx, entity)
}

func (r *repository) DeleteByID(ctx context.Context, id string) error {
	logger.C(ctx).Debugf("Deleting a user by ID %s", id)
	return r.deleterGlobal.DeleteOneGlobal(ctx, repo.Conditions{repo.NewEqualCondition("id", id)})
}
