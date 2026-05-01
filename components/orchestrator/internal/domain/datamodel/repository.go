package datamodel

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName        string = `public.data_models`
	versionTableName string = `public.data_model_versions`
	tenantColumn     string = `user_id`
)

var (
	updatableTableColumns = []string{"name", "description", "user_id", "schema", "current_version", "created_at", "updated_at"}
	idTableColumns        = []string{"id"}
	tableColumns          = append(idTableColumns, updatableTableColumns...)

	versionTableColumns = []string{"id", "data_model_id", "version_number", "schema", "change_description", "created_at", "created_by"}
)

type EntityConverter interface {
	ToEntity(model *model.DataModel) *Entity
	FromEntity(entity *Entity) *model.DataModel
	VersionToEntity(model *model.DataModelVersion) *VersionEntity
	VersionFromEntity(entity *VersionEntity) *model.DataModelVersion
}

type repository struct {
	creator        repo.Creator
	updater        repo.Updater
	singleGetter   repo.SingleGetter
	deleter        repo.Deleter
	lister         repo.Lister
	exister        repo.ExistQuerier
	versionCreator repo.Creator
	versionLister  repo.ListerGlobal
	versionGetter  repo.SingleGetterGlobal
	conv           EntityConverter
}

func NewRepository(conv EntityConverter) *repository {
	return &repository{
		creator:        repo.NewCreator(tableName, tableColumns),
		updater:        repo.NewUpdater(tableName, updatableTableColumns, idTableColumns),
		singleGetter:   repo.NewSingleGetter(tableName, tableColumns),
		deleter:        repo.NewDeleter(tableName),
		lister:         repo.NewListerWithEmbeddedTenant(tableName, tenantColumn, tableColumns),
		exister:        repo.NewExistQuerier(tableName),
		versionCreator: repo.NewCreator(versionTableName, versionTableColumns),
		versionLister:  repo.NewListerGlobal(resource.DataModelVersion, versionTableName, versionTableColumns),
		versionGetter:  repo.NewSingleGetterGlobal(resource.DataModelVersion, versionTableName, versionTableColumns),
		conv:           conv,
	}
}

func (r *repository) Create(ctx context.Context, item model.DataModel) error {
	logger.C(ctx).Debugf("Converting Data Model with id %s to entity", item.ID)
	entity := r.conv.ToEntity(&item)

	now := time.Now()
	entity.CreatedAt = &now
	entity.UpdatedAt = &now
	entity.CurrentVersion = 1

	logger.C(ctx).Debugf("Persisting Data Model entity with id %s to db", item.ID)
	return r.creator.Create(ctx, resource.DataModel, entity)
}

func (r *repository) List(ctx context.Context, tnt string) ([]*model.DataModel, error) {
	var entities EntityCollection

	logger.C(ctx).Debugf("Listing Data Models for tenant %s", tnt)
	err := r.lister.List(ctx, resource.DataModel, tnt, &entities)
	if err != nil {
		return nil, err
	}

	dataModels := make([]*model.DataModel, 0, len(entities))
	for _, entity := range entities {
		dataModel := r.conv.FromEntity(&entity)
		dataModels = append(dataModels, dataModel)
	}

	return dataModels, nil
}

func (r *repository) Get(ctx context.Context, tnt, id string) (*model.DataModel, error) {
	var dest Entity

	logger.C(ctx).Debugf("Retrieving Data Model with id %s for tenant %s", id, tnt)
	err := r.singleGetter.Get(ctx, resource.DataModel, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &dest)
	if err != nil {
		return nil, err
	}

	return r.conv.FromEntity(&dest), nil
}

func (r *repository) Delete(ctx context.Context, tnt, id string) error {
	logger.C(ctx).Debugf("Deleting Data Model with id %s for tenant %s", id, tnt)
	return r.deleter.DeleteOne(ctx, resource.DataModel, tnt, repo.Conditions{repo.NewEqualCondition("id", id)})
}

func (r *repository) Update(ctx context.Context, tnt string, item model.DataModel) error {
	logger.C(ctx).Debugf("Converting Data Model with id %s to entity", item.ID)
	entity := r.conv.ToEntity(&item)

	now := time.Now()
	entity.UpdatedAt = &now

	logger.C(ctx).Debugf("Updating Data Model entity with id %s in db", item.ID)
	return r.updater.UpdateSingle(ctx, resource.DataModel, tnt, entity)
}

func (r *repository) Exists(ctx context.Context, tnt string, id string) (bool, error) {
	logger.C(ctx).Debugf("Checking existence of Data Model with id %s for tenant %s", id, tnt)
	return r.exister.Exists(ctx, resource.DataModel, tnt, repo.Conditions{repo.NewEqualCondition("id", id)})
}

func (r *repository) CreateVersion(ctx context.Context, version model.DataModelVersion) error {
	logger.C(ctx).Debugf("Creating version %d for Data Model %s", version.VersionNumber, version.DataModelID)
	entity := r.conv.VersionToEntity(&version)
	return r.versionCreator.Create(ctx, resource.DataModelVersion, entity)
}

func (r *repository) ListVersions(ctx context.Context, dataModelID string) ([]*model.DataModelVersion, error) {
	var entities VersionEntityCollection

	logger.C(ctx).Debugf("Listing versions for Data Model %s", dataModelID)
	err := r.versionLister.ListGlobal(ctx, &entities, repo.NewEqualCondition("data_model_id", dataModelID))
	if err != nil {
		return nil, err
	}

	versions := make([]*model.DataModelVersion, 0, len(entities))
	for _, entity := range entities {
		version := r.conv.VersionFromEntity(&entity)
		versions = append(versions, version)
	}

	return versions, nil
}

func (r *repository) GetVersion(ctx context.Context, dataModelID string, versionNumber int) (*model.DataModelVersion, error) {
	var dest VersionEntity

	logger.C(ctx).Debugf("Retrieving version %d for Data Model %s", versionNumber, dataModelID)
	err := r.versionGetter.GetGlobal(ctx, repo.Conditions{
		repo.NewEqualCondition("data_model_id", dataModelID),
		repo.NewEqualCondition("version_number", versionNumber),
	}, repo.NoOrderBy, &dest)
	if err != nil {
		return nil, err
	}

	return r.conv.VersionFromEntity(&dest), nil
}
