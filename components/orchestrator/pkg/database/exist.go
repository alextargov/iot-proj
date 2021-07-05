package database

import (
	"context"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type ExistQuerier interface {
	Exists(ctx context.Context, userId string, field string, value interface{}) (bool, error)
}

type ExistQuerierGlobal interface {
	ExistsGlobal(ctx context.Context, field string, value interface{}) (bool, error)
}

type universalExistQuerier struct {
	collectionName    string
	userField *string
}

func NewExistQuerier(collectionName string, userField string) ExistQuerier {
	return &universalExistQuerier{collectionName: collectionName, userField: &userField}
}

func NewExistQuerierGlobal(collectionName string) ExistQuerierGlobal {
	return &universalExistQuerier{collectionName: collectionName}
}

func (g *universalExistQuerier) Exists(ctx context.Context, userId string, field string, value interface{}) (bool, error) {
	if userId == "" {
		return false, errors.New("userID not provided")
	}

	conditions := bson.D{{*g.userField, userId}}

	return g.exists(ctx, field, value, conditions)
}

func (g *universalExistQuerier) ExistsGlobal(ctx context.Context, field string, value interface{}) (bool, error) {
	return g.exists(ctx, field, value, nil)
}

func (g *universalExistQuerier) exists(ctx context.Context, field string, value interface{}, conditions bson.D) (bool, error) {
	db, err := FromCtx(ctx)
	if err != nil {
		return false, err
	}

	var result bson.M

	options := bson.D{{field, value}}.Map()

	if conditions != nil {
		for k, v := range conditions.Map() {
			options[k] = v
		}
	}

	err = db.Collection(g.collectionName).FindOne(ctx, options).Decode(&result)

	logrus.Debugf("Found %d documents matching %s = %s ", len(result), field, value)

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
