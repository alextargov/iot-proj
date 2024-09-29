package widget

import (
	"database/sql"
	"time"
)

type Entity struct {
	ID          string         `db:"id"`
	TenantID    string         `db:"user_id"`
	Name        string         `db:"name"`
	Description sql.NullString `db:"description"`
	Status      string         `db:"status"`
	DeviceIDs   sql.NullString `db:"device_ids"`
	CreatedAt   *time.Time     `db:"created_at"`
	UpdatedAt   *time.Time     `db:"updated_at"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
