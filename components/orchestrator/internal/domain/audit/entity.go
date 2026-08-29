package audit

import (
	"database/sql"
	"time"
)

// Entity represents the database entity for audit logs
type Entity struct {
	ID           string         `db:"id"`
	TenantID     string         `db:"tenant_id"`
	UserID       string         `db:"user_id"`
	Username     string         `db:"username"`
	Action       string         `db:"action"`
	ResourceType string         `db:"resource_type"`
	ResourceID   sql.NullString `db:"resource_id"`
	ResourceName sql.NullString `db:"resource_name"`
	Details      sql.NullString `db:"details"`
	IPAddress    sql.NullString `db:"ip_address"`
	UserAgent    sql.NullString `db:"user_agent"`
	Status       string         `db:"status"`
	ErrorMessage sql.NullString `db:"error_message"`
	CreatedAt    time.Time      `db:"created_at"`
}

// GetID returns the entity ID
func (e Entity) GetID() string {
	return e.ID
}

// EntityCollection represents a collection of audit log entities
type EntityCollection []Entity

// Len returns the length of the collection
func (c EntityCollection) Len() int {
	return len(c)
}
