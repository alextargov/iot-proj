package model

import (
	"encoding/json"
	"time"
)

type DataModel struct {
	ID          string          `json:"id"`
	TenantID    string          `json:"tenantID"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Schema      json.RawMessage `json:"schema"`
	CreatedAt   *time.Time      `json:"createdAt"`
	UpdatedAt   *time.Time      `json:"updatedAt"`
}

type DataModelInput struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Schema      json.RawMessage `json:"schema"`
}

func (dmi *DataModelInput) ToDataModel(id string) DataModel {
	return DataModel{
		ID:          id,
		Name:        dmi.Name,
		Description: dmi.Description,
		Schema:      dmi.Schema,
	}
}
