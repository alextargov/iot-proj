package audit

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

// Converter handles conversion between audit log entity, model, and GraphQL types
type Converter struct{}

// NewConverter creates a new audit converter
func NewConverter() *Converter {
	return &Converter{}
}

// ToEntity converts an AuditLog model to an Entity
func (c *Converter) ToEntity(m *model.AuditLog) *Entity {
	if m == nil {
		return nil
	}

	var detailsStr sql.NullString
	if m.Details != nil {
		detailsStr = sql.NullString{String: string(m.Details), Valid: true}
	}

	return &Entity{
		ID:           m.ID,
		TenantID:     m.TenantID,
		UserID:       m.UserID,
		Username:     m.Username,
		Action:       string(m.Action),
		ResourceType: m.ResourceType,
		ResourceID:   repo.NewNullableString(m.ResourceID),
		ResourceName: repo.NewNullableString(m.ResourceName),
		Details:      detailsStr,
		IPAddress:    repo.NewNullableString(m.IPAddress),
		UserAgent:    repo.NewNullableString(m.UserAgent),
		Status:       string(m.Status),
		ErrorMessage: repo.NewNullableString(m.ErrorMessage),
		CreatedAt:    m.CreatedAt,
	}
}

// FromEntity converts an Entity to an AuditLog model
func (c *Converter) FromEntity(e *Entity) *model.AuditLog {
	if e == nil {
		return nil
	}

	var details json.RawMessage
	if e.Details.Valid && e.Details.String != "" {
		details = json.RawMessage(e.Details.String)
	}

	return &model.AuditLog{
		ID:           e.ID,
		TenantID:     e.TenantID,
		UserID:       e.UserID,
		Username:     e.Username,
		Action:       model.AuditAction(e.Action),
		ResourceType: e.ResourceType,
		ResourceID:   repo.StringPtrFromNullableString(e.ResourceID),
		ResourceName: repo.StringPtrFromNullableString(e.ResourceName),
		Details:      details,
		IPAddress:    repo.StringPtrFromNullableString(e.IPAddress),
		UserAgent:    repo.StringPtrFromNullableString(e.UserAgent),
		Status:       model.AuditStatus(e.Status),
		ErrorMessage: repo.StringPtrFromNullableString(e.ErrorMessage),
		CreatedAt:    e.CreatedAt,
	}
}

// ToGraphQL converts an AuditLog model to a GraphQL AuditLog
func (c *Converter) ToGraphQL(m *model.AuditLog) *graphql.AuditLog {
	if m == nil {
		return nil
	}

	createdAt := graphql.Timestamp(m.CreatedAt)

	var details *string
	if m.Details != nil {
		s := string(m.Details)
		details = &s
	}

	return &graphql.AuditLog{
		ID:           m.ID,
		UserID:       m.UserID,
		Username:     m.Username,
		Action:       graphql.AuditAction(m.Action),
		ResourceType: m.ResourceType,
		ResourceID:   m.ResourceID,
		ResourceName: m.ResourceName,
		Details:      details,
		IPAddress:    m.IPAddress,
		UserAgent:    m.UserAgent,
		Status:       graphql.AuditStatus(m.Status),
		ErrorMessage: m.ErrorMessage,
		CreatedAt:    &createdAt,
	}
}

// MultipleToGraphQL converts multiple AuditLog models to GraphQL types
func (c *Converter) MultipleToGraphQL(models []*model.AuditLog) []*graphql.AuditLog {
	result := make([]*graphql.AuditLog, 0, len(models))
	for _, m := range models {
		result = append(result, c.ToGraphQL(m))
	}
	return result
}

// InputFromModel creates an AuditLog model from an AuditLogInput
func (c *Converter) InputFromModel(id string, input *model.AuditLogInput) *model.AuditLog {
	if input == nil {
		return nil
	}

	return &model.AuditLog{
		ID:           id,
		TenantID:     input.TenantID,
		UserID:       input.UserID,
		Username:     input.Username,
		Action:       input.Action,
		ResourceType: input.ResourceType,
		ResourceID:   input.ResourceID,
		ResourceName: input.ResourceName,
		Details:      input.Details,
		IPAddress:    input.IPAddress,
		UserAgent:    input.UserAgent,
		Status:       input.Status,
		ErrorMessage: input.ErrorMessage,
		CreatedAt:    time.Now(),
	}
}
