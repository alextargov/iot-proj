package database

import (
	"context"
	"github.com/pkg/errors"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Creator interface {
	InsertOne(ctx context.Context, entity interface{}) (string, error)
	InsertMany(ctx context.Context, entity []interface{}) ([]interface{}, error)
}

type universalCreate struct {
	collectionName string
	userField      *string
}

func NewCreator(collectionName string) Creator {
	return &universalCreate{collectionName: collectionName}
}

func (g *universalCreate) InsertOne(ctx context.Context, entity interface{}) (string, error) {
	persist, err := FromCtx(ctx)
	if err != nil {
		return "", err
	}

	var res *mongo.InsertOneResult
	res, err = persist.Collection(g.collectionName).InsertOne(ctx, entity, nil)

	if err != nil {
		return "", errors.Wrapf(err, "while inserting document")
	}

	return res.InsertedID.(primitive.ObjectID).Hex(), nil
}

func (g *universalCreate) InsertMany(ctx context.Context, entity []interface{}) ([]interface{}, error) {
	persist, err := FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var res *mongo.InsertManyResult
	res, err = persist.Collection(g.collectionName).InsertMany(ctx, entity, nil)

	if err != nil {
		return nil, errors.Wrapf(err, "while inserting document")
	}

	return res.InsertedIDs, nil
}
