package widget

import (
	"database/sql"
	"time"
)

type Entity struct {
	ID             string         `db:"id"`
	TenantID       string         `db:"user_id"`
	Name           string         `db:"name"`
	Description    sql.NullString `db:"description"`
	Status         string         `db:"status"`
	Schedule       sql.NullString `db:"schedule"`
	LastExecutedAt *time.Time     `db:"last_executed_at"`
	CreatedAt      *time.Time     `db:"created_at"`
	UpdatedAt      *time.Time     `db:"updated_at"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}

// WidgetDeviceEntity represents a row in the widget_devices junction table
type WidgetDeviceEntity struct {
	ID        string     `db:"id"`
	WidgetID  string     `db:"widget_id"`
	DeviceID  string     `db:"device_id"`
	CreatedAt *time.Time `db:"created_at"`
}

type WidgetDeviceEntityCollection []WidgetDeviceEntity

func (a WidgetDeviceEntityCollection) Len() int {
	return len(a)
}
