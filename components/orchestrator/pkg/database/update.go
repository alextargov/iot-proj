package database

import (
	"context"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	//"go.mongodb.org/mongo-driver/mongo"
	//cond "github.com/iot-proj/components/orchestrator/pkg/database/conditions"
)

type Updater interface {
	UpdateOne(ctx context.Context, userId string, entity bson.D, conditions bson.M) error
	UpdateMany(ctx context.Context, entity bson.D, userId string, conditions bson.M) error
}

type UpdaterGlobal interface {
	UpdateOneGlobal(ctx context.Context, entity bson.D, conditions bson.M) error
	UpdateManyGlobal(ctx context.Context, entity bson.D, conditions bson.M) error
}

type universalUpdate struct {
	collectionName string
	userField      *string
}

func NewUpdater(collectionName string, userField string) Updater {
	return &universalUpdate{collectionName: collectionName, userField: &userField}
}

func NewUpdaterGlobal(collectionName string) UpdaterGlobal {
	return &universalUpdate{collectionName: collectionName}
}

func (g *universalUpdate) UpdateOne(ctx context.Context, userId string, entity bson.D, conditions bson.M) error {
	if userId == "" {
		return errors.New("userId not provided")
	}

	id, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return err
	}

	newConditions := bson.D{{*g.userField, id}}.Map()
	for k, v := range conditions {
		newConditions[k] = v
	}

	return g.unsafeUpdate(ctx, entity, newConditions, true)
}

func (g *universalUpdate) UpdateMany(ctx context.Context, entity bson.D, userId string, conditions bson.M) error {
	if userId == "" {
		return errors.New("userId not provided")
	}

	id, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return err
	}

	newConditions := bson.D{{*g.userField, id}}.Map()
	for k, v := range conditions {
		newConditions[k] = v
	}

	return g.unsafeUpdate(ctx, entity, conditions, false)
}

func (g *universalUpdate) UpdateOneGlobal(ctx context.Context, entity bson.D, conditions bson.M) error {
	return g.unsafeUpdate(ctx, entity, conditions, true)
}

func (g *universalUpdate) UpdateManyGlobal(ctx context.Context, entity bson.D, conditions bson.M) error {
	return g.unsafeUpdate(ctx, entity, conditions, false)
}

func (g *universalUpdate) unsafeUpdate(ctx context.Context, entity bson.D, conditions bson.M, requireSingleRemoval bool) error {
	persist, err := FromCtx(ctx)
	if err != nil {
		return err
	}

	if requireSingleRemoval {
		var res bson.D
		err := persist.Collection(g.collectionName).FindOneAndUpdate(ctx, conditions, entity, nil).Decode(&res)

		if err != nil {
			return errors.Wrapf(err, "while updating single document")
		}
	} else {
		res, err := persist.Collection(g.collectionName).UpdateMany(ctx, conditions, entity)

		logrus.Debugf("%v", res.UpsertedID)
		//persist.Collection(g.collectionName).Find(ctx, cond.In())
		if err != nil {
			return errors.Wrapf(err, "while updating multiple documents")
		}
	}

	return nil
}
