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
		ID:             in.ID,
		Name:           in.Name,
		Description:    in.Description,
		Schema:         graphql.JSON(in.Schema),
		DeviceCount:    in.DeviceCount,
		CurrentVersion: in.CurrentVersion,
		CreatedAt:      graphql.TimePtrToTimestampPtr(in.CreatedAt),
		UpdatedAt:      graphql.TimePtrToTimestampPtr(in.UpdatedAt),
	}
}

func (c *converter) InputFromGraphQL(in graphql.DataModelInput) model.DataModelInput {
	return model.DataModelInput{
		Name:        in.Name,
		Description: in.Description,
		Schema:      json.RawMessage(in.Schema),
	}
}

func (c *converter) UpdateInputFromGraphQL(in graphql.UpdateDataModelInput) model.UpdateDataModelInput {
	var schema *json.RawMessage
	if in.Schema != nil {
		raw := json.RawMessage(*in.Schema)
		schema = &raw
	}

	return model.UpdateDataModelInput{
		Name:              in.Name,
		Description:       in.Description,
		Schema:            schema,
		ChangeDescription: in.ChangeDescription,
	}
}

func (c *converter) FromEntity(entity *Entity) *model.DataModel {
	if entity == nil {
		return nil
	}

	return &model.DataModel{
		ID:             entity.ID,
		TenantID:       entity.TenantID,
		Name:           entity.Name,
		Description:    entity.Description,
		Schema:         entity.Schema,
		CurrentVersion: entity.CurrentVersion,
		CreatedAt:      entity.CreatedAt,
		UpdatedAt:      entity.UpdatedAt,
	}
}

func (c *converter) ToEntity(model *model.DataModel) *Entity {
	if model == nil {
		return nil
	}

	return &Entity{
		ID:             model.ID,
		TenantID:       model.TenantID,
		Name:           model.Name,
		Description:    model.Description,
		Schema:         model.Schema,
		CurrentVersion: model.CurrentVersion,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}
}

func (c *converter) VersionToGraphQL(in *model.DataModelVersion) *graphql.DataModelVersion {
	if in == nil {
		return nil
	}

	return &graphql.DataModelVersion{
		ID:                in.ID,
		DataModelID:       in.DataModelID,
		VersionNumber:     in.VersionNumber,
		Schema:            graphql.JSON(in.Schema),
		ChangeDescription: in.ChangeDescription,
		CreatedAt:         graphql.Timestamp(in.CreatedAt),
		CreatedBy:         in.CreatedBy,
	}
}

func (c *converter) MultipleVersionsToGraphQL(in []*model.DataModelVersion) []*graphql.DataModelVersion {
	var result []*graphql.DataModelVersion
	for _, item := range in {
		result = append(result, c.VersionToGraphQL(item))
	}
	return result
}

func (c *converter) VersionFromEntity(entity *VersionEntity) *model.DataModelVersion {
	if entity == nil {
		return nil
	}

	return &model.DataModelVersion{
		ID:                entity.ID,
		DataModelID:       entity.DataModelID,
		VersionNumber:     entity.VersionNumber,
		Schema:            entity.Schema,
		ChangeDescription: entity.ChangeDescription,
		CreatedAt:         entity.CreatedAt,
		CreatedBy:         entity.CreatedBy,
	}
}

func (c *converter) VersionToEntity(model *model.DataModelVersion) *VersionEntity {
	if model == nil {
		return nil
	}

	return &VersionEntity{
		ID:                model.ID,
		DataModelID:       model.DataModelID,
		VersionNumber:     model.VersionNumber,
		Schema:            model.Schema,
		ChangeDescription: model.ChangeDescription,
		CreatedAt:         model.CreatedAt,
		CreatedBy:         model.CreatedBy,
	}
}
