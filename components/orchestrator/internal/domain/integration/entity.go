package integration

import (
	"database/sql"
	"time"
)

// Entity is the DB entity for integrations.
type Entity struct {
	ID        string         `db:"id"`
	TenantID  string         `db:"tenant_id"`
	Name      string         `db:"name"`
	Type      string         `db:"type"`
	Endpoint  string         `db:"endpoint"`
	AuthToken sql.NullString `db:"auth_token"`
	Config    sql.NullString `db:"config"`
	Enabled   bool           `db:"enabled"`
	CreatedAt *time.Time     `db:"created_at"`
	UpdatedAt sql.NullTime   `db:"updated_at"`
}

// EntityCollection is a slice of integration entities.
type EntityCollection []Entity

// Len returns the length of the collection.
func (c EntityCollection) Len() int { return len(c) }
