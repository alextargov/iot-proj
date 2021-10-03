package devices

import (
	"context"
	"github.com/iot-proj/components/orchestrator/pkg/database"
	"github.com/iot-proj/components/orchestrator/pkg/database/conditions"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
)

const deviceCollection string = `devices`

type EntityConverter interface {
	ToEntity(model Model) *Entity
	FromRawToModel(raw []byte) (Model, error)
	ToModel(entity Entity) *Model
}

type pgRepository struct {
	existQuerier database.ExistQuerierGlobal
	deleter      database.DeleterGlobal
	getter       database.GetterGlobal
	creator      database.Creator
	updater      database.UpdaterGlobal
	converter    EntityConverter
}

func NewRepository(converter EntityConverter) *pgRepository {
	return &pgRepository{
		existQuerier: database.NewExistQuerierGlobal(deviceCollection),
		deleter:      database.NewDeleterGlobal(deviceCollection),
		getter:       database.NewGetterGlobal(deviceCollection),
		creator:      database.NewCreator(deviceCollection),
		updater:      database.NewUpdaterGlobal(deviceCollection),
		converter:    converter,
	}
}

func (r *pgRepository) Exists(ctx context.Context, id string) (bool, error) {
	matchCondition, err := conditions.Equals("_id", id, true)
	if err != nil {
		return false, err
	}

	return r.existQuerier.ExistsGlobal(ctx, matchCondition.Map())
}

func (r *pgRepository) DeleteGlobalById(ctx context.Context, id string) error {
	matchCondition, err := conditions.Equals("_id", id, true)
	if err != nil {
		return err
	}

	return r.deleter.DeleteOneGlobal(ctx, matchCondition.Map())
}

func (r *pgRepository) GetGlobalByID(ctx context.Context, id string) (*Model, error) {
	var entity Entity

	matchCondition, err := conditions.Equals("_id", id, true)
	if err != nil {
		return nil, err
	}

	if err := r.getter.GetOneGlobal(ctx, &entity, matchCondition.Map()); err != nil {
		return nil, err
	}

	model := r.converter.ToModel(entity)

	return model, nil
}

func (r *pgRepository) GetScopedByID(ctx context.Context, userId, id string) (*Model, error) {
	var entity Entity

	matchCondition, err := conditions.Equals("_id", id, true)
	if err != nil {
		return nil, err
	}

	if err := r.getter.GetOne(ctx, &entity, userId, matchCondition.Map()); err != nil {
		return nil, err
	}

	model := r.converter.ToModel(entity)

	return model, nil
}

func (r *pgRepository) GetScopedAll(ctx context.Context, userId string) ([]*Model, error) {
	var entities EntityCollection

	err := r.getter.GetMany(ctx, &entities, userId, bson.M{})

	if err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

func (r *pgRepository) GetAll(ctx context.Context) ([]*Model, error) {
	var entities EntityCollection

	err := r.getter.GetManyGlobal(ctx, &entities, bson.M{})

	if err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

func (r *pgRepository) Create(ctx context.Context, model *Model) (string, error) {
	if model == nil {
		return "", errors.New("model can not be empty")
	}

	logrus.Debugf("Converting Device model with name %s to entity", model.Name)
	appEnt := r.converter.ToEntity(*model)

	logrus.Debugf("Persisting Application entity with id %s to db", model.ID)
	return r.creator.InsertOne(ctx, appEnt)
}

func (r *pgRepository) Update(ctx context.Context, model *Model) error {
	return r.updateSingle(ctx, model)
}

func (r *pgRepository) updateSingle(ctx context.Context, model *Model) error {
	if model == nil {
		return errors.New("model can not be empty")
	}

	bsonObj := conditions.Update(model)

	matchCondition, err := conditions.Equals("_id", *model.ID, true)
	if err != nil {
		return err
	}

	return r.updater.UpdateOneGlobal(ctx, bsonObj, matchCondition.Map())
}

func (r *pgRepository) multipleFromEntities(entities EntityCollection) ([]*Model, error) {
	var items []*Model
	for _, ent := range entities {
		m := r.converter.ToModel(ent)
		items = append(items, m)
	}
	return items, nil
}
