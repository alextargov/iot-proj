package datamodel

import (
	"encoding/json"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct{}

func NewConverter() *converter {
	return &converter{}
}

func (c *converter) MultipleToGraphQL(in []*model.DataModel) []*graphql.DataModel {
	var result []*graphql.DataModel
	for _, item := range in {
		result = append(result, c.ToGraphQL(item))
	}
	return result
}

func (c *converter) ToGraphQL(in *model.DataModel) *graphql.DataModel {
	if in == nil {
		return nil
	}

	return &graphql.DataModel{
		ID:          in.ID,
		Name:        in.Name,
		Description: in.Description,
		Schema:      graphql.JSON(in.Schema),
		CreatedAt:   graphql.TimePtrToTimestampPtr(in.CreatedAt),
		UpdatedAt:   graphql.TimePtrToTimestampPtr(in.UpdatedAt),
	}
}

func (c *converter) InputFromGraphQL(in graphql.DataModelInput) model.DataModelInput {
	return model.DataModelInput{
		Name:        in.Name,
		Description: in.Description,
		Schema:      json.RawMessage(in.Schema),
	}
}

func (c *converter) FromEntity(entity *Entity) *model.DataModel {
	if entity == nil {
		return nil
	}

	return &model.DataModel{
		ID:          entity.ID,
		TenantID:    entity.TenantID,
		Name:        entity.Name,
		Description: entity.Description,
		Schema:      entity.Schema,
		CreatedAt:   entity.CreatedAt,
		UpdatedAt:   entity.UpdatedAt,
	}
}

func (c *converter) ToEntity(model *model.DataModel) *Entity {
	if model == nil {
		return nil
	}

	return &Entity{
		ID:          model.ID,
		TenantID:    model.TenantID,
		Name:        model.Name,
		Description: model.Description,
		Schema:      model.Schema,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
	}
}
