package users

import (
	"context"
	"github.com/iot-proj/components/orchestrator/pkg/database"
	"github.com/iot-proj/components/orchestrator/pkg/database/conditions"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
)

const usersCollection string = `users`

type EntityConverter interface {
	ToEntity(model UserModel) *Entity
	FromRawToModel(raw []byte) (UserModel, error)
	FromRawToLoginModel(raw []byte) (LoginModel, error)
	ToModel(entity Entity) *UserModel
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
		existQuerier: database.NewExistQuerierGlobal(usersCollection),
		deleter:      database.NewDeleterGlobal(usersCollection),
		getter:       database.NewGetterGlobal(usersCollection),
		creator:      database.NewCreator(usersCollection),
		updater:      database.NewUpdaterGlobal(usersCollection),
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

func (r *pgRepository) DeleteGlobal(ctx context.Context, id string) error {
	matchCondition, err := conditions.Equals("_id", id, true)
	if err != nil {
		return err
	}

	return r.deleter.DeleteOneGlobal(ctx, matchCondition.Map())
}

func (r *pgRepository) GetGlobalByID(ctx context.Context, id string) (*UserModel, error) {
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

func (r *pgRepository) GetAll(ctx context.Context) ([]*UserModel, error) {
	var entities EntityCollection

	err := r.getter.GetManyGlobal(ctx, &entities, bson.M{})

	if err != nil {
		return nil, err
	}

	return r.multipleFromEntities(entities)
}

func (r *pgRepository) GetOne(ctx context.Context, conditions bson.M) (*UserModel, error) {
	var entity Entity

	err := r.getter.GetOneGlobal(ctx, &entity, conditions)
	if err != nil {
		return nil, err
	}

	model := r.converter.ToModel(entity)

	return model, nil
}

func (r *pgRepository) Create(ctx context.Context, model *UserModel) (string, error) {
	if model == nil {
		return "", errors.New("model can not be empty")
	}

	logrus.Debugf("Converting Application model with id %s to entity", model.ID)
	appEnt := r.converter.ToEntity(*model)

	logrus.Debugf("Persisting Application entity with id %s to db", model.ID)
	return r.creator.InsertOne(ctx, appEnt)
}

func (r *pgRepository) Update(ctx context.Context, model *UserModel) error {
	return r.updateSingle(ctx, model)
}

func (r *pgRepository) updateSingle(ctx context.Context, model *UserModel) error {
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

func (r *pgRepository) multipleFromEntities(entities EntityCollection) ([]*UserModel, error) {
	var items []*UserModel
	for _, ent := range entities {
		m := r.converter.ToModel(ent)
		items = append(items, m)
	}
	return items, nil
}
