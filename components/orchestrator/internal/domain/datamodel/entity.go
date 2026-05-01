package datamodel

import (
	"encoding/json"
	"time"
)

type Entity struct {
	ID             string          `db:"id"`
	TenantID       string          `db:"user_id"`
	Name           string          `db:"name"`
	Description    string          `db:"description"`
	Schema         json.RawMessage `db:"schema"`
	CurrentVersion int             `db:"current_version"`
	CreatedAt      *time.Time      `db:"created_at"`
	UpdatedAt      *time.Time      `db:"updated_at"`
}

func (e Entity) GetID() string {
	return e.ID
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}

type VersionEntity struct {
	ID                string          `db:"id"`
	DataModelID       string          `db:"data_model_id"`
	VersionNumber     int             `db:"version_number"`
	Schema            json.RawMessage `db:"schema"`
	ChangeDescription *string         `db:"change_description"`
	CreatedAt         time.Time       `db:"created_at"`
	CreatedBy         *string         `db:"created_by"`
}

func (e VersionEntity) GetID() string {
	return e.ID
}

type VersionEntityCollection []VersionEntity

func (a VersionEntityCollection) Len() int {
	return len(a)
}
