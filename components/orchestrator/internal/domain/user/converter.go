package user

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
)

type converter struct {
}

func NewConverter() *converter {
	return &converter{}
}

// FromEntity missing godoc
func (c *converter) FromEntity(entity *Entity) *model.User {
	if entity == nil {
		return nil
	}

	return &model.User{
		ID:        entity.ID,
		Username:  entity.Username,
		Password:  entity.Password,
		CreatedAt: entity.CreatedAt,
		UpdatedAt: entity.UpdatedAt,
	}
}

// ToEntity missing godoc
func (c *converter) ToEntity(user model.User) *Entity {
	return &Entity{
		ID:        user.ID,
		Username:  user.Username,
		Password:  user.Password,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}
