package organization

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct{}

// NewConverter creates a new organization converter.
func NewConverter() *converter {
	return &converter{}
}

// OrgFromEntity converts an OrgEntity to a model.Organization.
func (c *converter) OrgFromEntity(entity *OrgEntity) *model.Organization {
	if entity == nil {
		return nil
	}
	org := &model.Organization{
		ID:          entity.ID,
		Name:        entity.Name,
		OwnerUserID: entity.OwnerUserID,
		CreatedAt:   entity.CreatedAt,
	}
	if entity.UpdatedAt.Valid {
		org.UpdatedAt = &entity.UpdatedAt.Time
	}
	return org
}

// MemberFromEntity converts a MemberEntity to a model.OrganizationMember.
func (c *converter) MemberFromEntity(entity *MemberEntity) model.OrganizationMember {
	return model.OrganizationMember{
		ID:             entity.ID,
		OrganizationID: entity.OrganizationID,
		UserID:         entity.UserID,
		Username:       entity.Username,
		Role:           model.Role(entity.Role),
		CreatedAt:      entity.CreatedAt,
	}
}

// MembersFromEntities converts a collection of member entities to models.
func (c *converter) MembersFromEntities(entities MemberEntityCollection) []model.OrganizationMember {
	out := make([]model.OrganizationMember, 0, len(entities))
	for i := range entities {
		out = append(out, c.MemberFromEntity(&entities[i]))
	}
	return out
}

// ToGraphQL converts a model.Organization to graphql.Organization.
func (c *converter) ToGraphQL(m *model.Organization) *graphql.Organization {
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

	members := make([]*graphql.OrganizationMember, 0, len(m.Members))
	for _, mem := range m.Members {
		members = append(members, &graphql.OrganizationMember{
			ID:       mem.ID,
			UserID:   mem.UserID,
			Username: mem.Username,
			Role:     graphql.Role(mem.Role),
		})
	}

	return &graphql.Organization{
		ID:          m.ID,
		Name:        m.Name,
		OwnerUserID: m.OwnerUserID,
		Members:     members,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}
}

// MultipleToGraphQL converts a slice of organizations to graphql.
func (c *converter) MultipleToGraphQL(items []*model.Organization) []*graphql.Organization {
	out := make([]*graphql.Organization, 0, len(items))
	for _, m := range items {
		out = append(out, c.ToGraphQL(m))
	}
	return out
}
