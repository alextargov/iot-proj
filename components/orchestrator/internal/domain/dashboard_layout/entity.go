package dashboard_layout

import (
	"database/sql"
	"time"
)

type Entity struct {
	ID                     string         `db:"id"`
	TenantID               string         `db:"tenant_id"`
	Name                   string         `db:"name"`
	Description            sql.NullString `db:"description"`
	IsDefault              bool           `db:"is_default"`
	RefreshIntervalSeconds int            `db:"refresh_interval_seconds"`
	CreatedAt              *time.Time     `db:"created_at"`
	UpdatedAt              sql.NullTime   `db:"updated_at"`
}

type EntityCollection []Entity

func (c EntityCollection) Len() int {
	return len(c)
}
