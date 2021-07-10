package database

import (
	"context"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Deleter interface {
	DeleteOne(ctx context.Context, tenant string, conditions bson.M) error
	DeleteMany(ctx context.Context, tenant string, conditions bson.M) error
}

type DeleterGlobal interface {
	DeleteOneGlobal(ctx context.Context, conditions bson.M) error
	DeleteManyGlobal(ctx context.Context, conditions bson.M) error
}

type universalDelete struct {
	collectionName string
	userField      *string
}

func NewDeleter(collectionName string, userField string) Deleter {
	return &universalDelete{collectionName: collectionName, userField: &userField}
}

func NewDeleterGlobal(collectionName string) DeleterGlobal {
	return &universalDelete{collectionName: collectionName}
}

func (g *universalDelete) DeleteOne(ctx context.Context, userId string, conditions bson.M) error {
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

	return g.unsafeDelete(ctx, newConditions, true)
}

func (g *universalDelete) DeleteMany(ctx context.Context, userId string, conditions bson.M) error {
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

	return g.unsafeDelete(ctx, conditions, false)
}

func (g *universalDelete) DeleteOneGlobal(ctx context.Context, conditions bson.M) error {
	return g.unsafeDelete(ctx, conditions, true)
}

func (g *universalDelete) DeleteManyGlobal(ctx context.Context, conditions bson.M) error {
	return g.unsafeDelete(ctx, conditions, false)
}

func (g *universalDelete) unsafeDelete(ctx context.Context, conditions bson.M, requireSingleRemoval bool) error {
	persist, err := FromCtx(ctx)
	if err != nil {
		return err
	}

	var res *mongo.DeleteResult
	if requireSingleRemoval {
		res, err = persist.Collection(g.collectionName).DeleteOne(ctx, conditions)
	} else {
		res, err = persist.Collection(g.collectionName).DeleteMany(ctx, conditions)
	}

	if err != nil {
		return errors.Wrapf(err, "while deleting document")
	}

	logrus.Infof("Delete %d documents", res.DeletedCount)

	return nil
}
