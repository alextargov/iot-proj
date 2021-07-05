package mongorepo

import "go.mongodb.org/mongo-driver/mongo"

// MongoRepo is repository that connects to MongoDB
// one instance of MongoRepo is responsible for one type of collection & data type
type MongoRepo struct {
	collection  *mongo.Collection
	constructor func() interface{}
}

// New creates a new instance of MongoRepo
func New(coll *mongo.Collection, cons func() interface{}) *MongoRepo {
	return &MongoRepo{
		collection:  coll,
		constructor: cons,
	}
}
