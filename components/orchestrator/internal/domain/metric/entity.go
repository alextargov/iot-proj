package metric

import (
	"database/sql"
	"time"
)

// Entity represents the database entity for device metrics
type Entity struct {
	ID          string         `db:"id"`
	DeviceID    string         `db:"device_id"`
	TenantID    string         `db:"tenant_id"`
	MetricName  string         `db:"metric_name"`
	MetricValue float64        `db:"metric_value"`
	Unit        sql.NullString `db:"unit"`
	RecordedAt  time.Time      `db:"recorded_at"`
	CreatedAt   *time.Time     `db:"created_at"`
}

// EntityCollection represents a collection of metric entities
type EntityCollection []Entity

// Len returns the length of the collection
func (c EntityCollection) Len() int {
	return len(c)
}
