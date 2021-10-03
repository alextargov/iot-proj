package database

import (
	"context"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Getter interface {
	GetOne(ctx context.Context, destination interface{}, userId string, conditions bson.M) error
	GetMany(ctx context.Context, destination interface{}, userId string, conditions bson.M) error
}

type GetterGlobal interface {
	GetOneGlobal(ctx context.Context, destination interface{}, conditions bson.M) error
	GetOne(ctx context.Context, destination interface{}, userId string, conditions bson.M) error
	GetManyGlobal(ctx context.Context, destination interface{}, conditions bson.M) error
	GetMany(ctx context.Context, destination interface{}, userId string, conditions bson.M) error
}

type universalGet struct {
	collectionName string
	userField      *string
}

func NewGetter(collectionName string, userField string) Getter {
	return &universalGet{collectionName: collectionName, userField: &userField}
}

func NewGetterGlobal(collectionName string) GetterGlobal {
	return &universalGet{collectionName: collectionName}
}

func (g *universalGet) GetOne(ctx context.Context, destination interface{}, userId string, conditions bson.M) error {
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

	return g.unsafeGet(ctx, destination, newConditions, true)
}

func (g *universalGet) GetMany(ctx context.Context, destination interface{}, userId string, conditions bson.M) error {
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

	return g.unsafeGet(ctx, destination, conditions, false)
}

func (g *universalGet) GetOneGlobal(ctx context.Context, destination interface{}, conditions bson.M) error {
	return g.unsafeGet(ctx, destination, conditions, true)
}

func (g *universalGet) GetManyGlobal(ctx context.Context, destination interface{}, conditions bson.M) error {
	return g.unsafeGet(ctx, destination, conditions, false)
}

func (g *universalGet) unsafeGet(ctx context.Context, destination interface{}, conditions bson.M, requireSingleGet bool) error {
	persist, err := FromCtx(ctx)
	if err != nil {
		return err
	}

	if requireSingleGet {
		err := persist.Collection(g.collectionName).FindOne(ctx, conditions).Decode(destination)
		if err != nil {
			return err
			logrus.Error(err)
		}
	} else {
		cursor, err := persist.Collection(g.collectionName).Find(ctx, conditions)

		if err != nil {
			return err
			logrus.Error(err)
		}

		if err := cursor.All(ctx, destination); err != nil {
			return err
			logrus.Error(err)
		}
	}

	return nil
}
