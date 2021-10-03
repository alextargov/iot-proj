package users

import (
	"encoding/json"
	"github.com/pkg/errors"
)

type converter struct {
}

func NewConverter() *converter {
	return &converter{}
}

func (c *converter) ToEntity(model UserModel) *Entity {
	return &Entity{
		ID:       model.ID,
		Username: model.Username,
		Password: model.Password,
		Type:     model.Type,
	}
}

func (c *converter) FromRawToModel(raw []byte) (UserModel, error) {
	var model UserModel

	err := json.Unmarshal(raw, &model)
	if err != nil {
		return UserModel{}, errors.Wrapf(err, "while unmarshalling user model")
	}
	return model, nil
}

func (c *converter) FromRawToLoginModel(raw []byte) (LoginModel, error) {
	var model LoginModel

	err := json.Unmarshal(raw, &model)
	if err != nil {
		return LoginModel{}, errors.Wrapf(err, "while unmarshalling login model")
	}
	return model, nil
}

func (c *converter) ToModel(entity Entity) *UserModel {
	return &UserModel{
		ID:       entity.ID,
		Username: entity.Username,
		Password: entity.Password,
		Type:     entity.Type,
	}
}
