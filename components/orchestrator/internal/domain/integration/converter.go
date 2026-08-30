package integration

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct{}

// NewConverter creates a new integration converter.
func NewConverter() *converter {
	return &converter{}
}

// ToEntity converts a model.Integration to an Entity.
func (c *converter) ToEntity(m model.Integration) *Entity {
	entity := &Entity{
		ID:        m.ID,
		TenantID:  m.TenantID,
		Name:      m.Name,
		Type:      string(m.Type),
		Endpoint:  m.Endpoint,
		AuthToken: repo.NewNullableString(m.AuthToken),
		Config:    repo.NewNullableString(m.Config),
		Enabled:   m.Enabled,
		CreatedAt: m.CreatedAt,
	}
	if m.UpdatedAt != nil {
		entity.UpdatedAt.Time = *m.UpdatedAt
		entity.UpdatedAt.Valid = true
	}
	return entity
}

// FromEntity converts an Entity to a model.Integration.
func (c *converter) FromEntity(entity *Entity) *model.Integration {
	if entity == nil {
		return nil
	}
	m := &model.Integration{
		ID:        entity.ID,
		TenantID:  entity.TenantID,
		Name:      entity.Name,
		Type:      model.IntegrationType(entity.Type),
		Endpoint:  entity.Endpoint,
		AuthToken: repo.StringPtrFromNullableString(entity.AuthToken),
		Config:    repo.StringPtrFromNullableString(entity.Config),
		Enabled:   entity.Enabled,
		CreatedAt: entity.CreatedAt,
	}
	if entity.UpdatedAt.Valid {
		m.UpdatedAt = &entity.UpdatedAt.Time
	}
	return m
}

// MultipleFromEntity converts a collection of entities to models.
func (c *converter) MultipleFromEntity(entities EntityCollection) []*model.Integration {
	out := make([]*model.Integration, 0, len(entities))
	for i := range entities {
		out = append(out, c.FromEntity(&entities[i]))
	}
	return out
}

// ToGraphQL converts a model.Integration to graphql.Integration.
func (c *converter) ToGraphQL(m *model.Integration) *graphql.Integration {
	if m == nil {
		return nil
	}
	var createdAt, updatedAt *graphql.Timestamp
	if m.CreatedAt != nil {
		ts := graphql.Timestamp(*m.CreatedAt)
		createdAt = &ts
	}
	if m.UpdatedAt != nil {
		ts := graphql.Timestamp(*m.UpdatedAt)
		updatedAt = &ts
	}
	return &graphql.Integration{
		ID:           m.ID,
		Name:         m.Name,
		Type:         graphql.IntegrationType(m.Type),
		Endpoint:     m.Endpoint,
		HasAuthToken: m.AuthToken != nil && *m.AuthToken != "",
		Config:       m.Config,
		Enabled:      m.Enabled,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	}
}

// MultipleToGraphQL converts a slice of models to graphql.
func (c *converter) MultipleToGraphQL(items []*model.Integration) []*graphql.Integration {
	out := make([]*graphql.Integration, 0, len(items))
	for _, m := range items {
		out = append(out, c.ToGraphQL(m))
	}
	return out
}

// CreateInputFromGraphQL converts graphql.CreateIntegrationInput to model.
func (c *converter) CreateInputFromGraphQL(in graphql.CreateIntegrationInput) model.CreateIntegrationInput {
	return model.CreateIntegrationInput{
		Name:      in.Name,
		Type:      model.IntegrationType(in.Type),
		Endpoint:  in.Endpoint,
		AuthToken: in.AuthToken,
		Config:    in.Config,
	}
}

// UpdateInputFromGraphQL converts graphql.UpdateIntegrationInput to model.
func (c *converter) UpdateInputFromGraphQL(in graphql.UpdateIntegrationInput) model.UpdateIntegrationInput {
	return model.UpdateIntegrationInput{
		Name:      in.Name,
		Endpoint:  in.Endpoint,
		AuthToken: in.AuthToken,
		Config:    in.Config,
		Enabled:   in.Enabled,
	}
}
