package dashboard_widget

import (
	"database/sql"
	"time"
)

type Entity struct {
	ID                string         `db:"id"`
	DashboardLayoutID string         `db:"dashboard_layout_id"`
	TenantID          string         `db:"tenant_id"`
	WidgetType        string         `db:"widget_type"`
	Title             string         `db:"title"`
	GridX             int            `db:"grid_x"`
	GridY             int            `db:"grid_y"`
	GridCols          int            `db:"grid_cols"`
	GridRows          int            `db:"grid_rows"`
	DeviceID          sql.NullString `db:"device_id"`
	MetricName        sql.NullString `db:"metric_name"`
	Config            string         `db:"config"`
	CreatedAt         *time.Time     `db:"created_at"`
	UpdatedAt         sql.NullTime   `db:"updated_at"`
}

type EntityCollection []Entity

func (c EntityCollection) Len() int {
	return len(c)
}
