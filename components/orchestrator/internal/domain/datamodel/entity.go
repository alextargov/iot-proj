package datamodel

import (
	"encoding/json"
	"time"
)

type Entity struct {
	ID          string          `db:"id"`
	TenantID    string          `db:"user_id"`
	Name        string          `db:"name"`
	Description string          `db:"description"`
	Schema      json.RawMessage `db:"schema"`
	CreatedAt   *time.Time      `db:"created_at"`
	UpdatedAt   *time.Time      `db:"updated_at"`
}

func (e Entity) GetID() string {
	return e.ID
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
