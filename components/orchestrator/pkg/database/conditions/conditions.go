package conditions

import (
	"github.com/pkg/errors"
	"github.com/prometheus/common/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"reflect"
)

func Equals(field string, value interface{}, isHex bool) (bson.D, error) {
	value, err := parseValue(value, isHex)
	if err != nil {
		return nil, err
	}

	return bson.D{{field, value}}, nil
}

func NotEquals(field string, value interface{}, isHex bool) (bson.D, error) {
	value, err := parseValue(value, isHex)
	if err != nil {
		return nil, err
	}

	return bson.D{{
		field,
		bson.D{{"$ne", value}},
	}}, nil
}

func In(field string, values []interface{}, isHex bool) (bson.D, error) {
	value, err := parseValue(values, isHex)
	if err != nil {
		return nil, err
	}

	return bson.D{{
		field,
		bson.D{{
			"$in",
			value,
		}},
	}}, nil
}

func Update(obj interface{}) bson.D {
	v := reflect.ValueOf(obj)
	t := v.Type()

	updates := bson.M{}
	for i := 0; i < v.NumField(); i++ {
		key := t.Name()
		val := v.Field(i).Interface()

		updates[key] = val
	}

	return bson.D{{"$set", updates}}
}

func parseValue(value interface{}, isHex bool) (interface{}, error) {
	parsedValue := value
	if isHex {
		var err error

		rt := reflect.TypeOf(value)
		switch rt.Kind() {
		case reflect.String:
			parsedValue, err = primitive.ObjectIDFromHex(value.(string))
			if err != nil {
				return nil, err
			}

		case reflect.Slice:
			s := reflect.ValueOf(value)
			slice := make([]interface{}, s.Len())
			for i := 0; i < s.Len(); i++ {
				parsedValue, err = primitive.ObjectIDFromHex(s.Index(i).String())
				if err != nil {
					return nil, err
				}
				slice[i] = parsedValue
			}

			return slice, nil
		default:
			msg := "Proper type is not passed"
			log.Error(msg)

			return nil, errors.New(msg)
		}
	}

	return value, nil
}
