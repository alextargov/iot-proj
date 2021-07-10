package database

import (
	"context"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ExistQuerier interface {
	Exists(ctx context.Context, userId string, conditions bson.M) (bool, error)
}

type ExistQuerierGlobal interface {
	ExistsGlobal(ctx context.Context, conditions bson.M) (bool, error)
}

type universalExistQuerier struct {
	collectionName string
	userField      *string
}

func NewExistQuerier(collectionName string, userField string) ExistQuerier {
	return &universalExistQuerier{collectionName: collectionName, userField: &userField}
}

func NewExistQuerierGlobal(collectionName string) ExistQuerierGlobal {
	return &universalExistQuerier{collectionName: collectionName}
}

func (g *universalExistQuerier) Exists(ctx context.Context, userId string, conditions bson.M) (bool, error) {
	if userId == "" {
		return false, errors.New("userID not provided")
	}

	id, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return false, err
	}

	newConditions := bson.D{{*g.userField, id}}.Map()
	for k, v := range conditions {
		newConditions[k] = v
	}

	return g.exists(ctx, newConditions)
}

func (g *universalExistQuerier) ExistsGlobal(ctx context.Context, conditions bson.M) (bool, error) {
	return g.exists(ctx, conditions)
}

func (g *universalExistQuerier) exists(ctx context.Context, conditions bson.M) (bool, error) {
	db, err := FromCtx(ctx)
	if err != nil {
		return false, err
	}

	var result bson.M

	err = db.Collection(g.collectionName).FindOne(ctx, conditions).Decode(&result)

	logrus.Debugf("Found %d documents matching %v ", len(result), conditions)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}

		return false, nil
	}

	if len(result) > 0 {
		return true, nil
	}

	return false, nil
}
