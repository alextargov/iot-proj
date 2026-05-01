package model

import (
	"encoding/json"
	"time"
)

type DataModel struct {
	ID             string          `json:"id"`
	TenantID       string          `json:"tenantID"`
	Name           string          `json:"name"`
	Description    string          `json:"description"`
	Schema         json.RawMessage `json:"schema"`
	DeviceCount    int             `json:"deviceCount"`
	CurrentVersion int             `json:"currentVersion"`
	CreatedAt      *time.Time      `json:"createdAt"`
	UpdatedAt      *time.Time      `json:"updatedAt"`
}

type DataModelInput struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Schema      json.RawMessage `json:"schema"`
}

type UpdateDataModelInput struct {
	Name              *string          `json:"name"`
	Description       *string          `json:"description"`
	Schema            *json.RawMessage `json:"schema"`
	ChangeDescription *string          `json:"changeDescription"`
}

type DataModelVersion struct {
	ID                string          `json:"id"`
	DataModelID       string          `json:"dataModelId"`
	VersionNumber     int             `json:"versionNumber"`
	Schema            json.RawMessage `json:"schema"`
	ChangeDescription *string         `json:"changeDescription"`
	CreatedAt         time.Time       `json:"createdAt"`
	CreatedBy         *string         `json:"createdBy"`
}

func (dmi *DataModelInput) ToDataModel(id string) DataModel {
	return DataModel{
		ID:             id,
		Name:           dmi.Name,
		Description:    dmi.Description,
		Schema:         dmi.Schema,
		CurrentVersion: 1,
	}
}
