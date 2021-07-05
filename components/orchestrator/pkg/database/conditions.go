package database

import "go.mongodb.org/mongo-driver/bson"

func Equals(field string, value interface{}) bson.D {
	return bson.D{{field, value}}
}

func In(field string, values []interface{}) bson.D {
	return bson.D{{
		field,
		bson.D{{
			"$in",
			values,
		}},
	}}
}