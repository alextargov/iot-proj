package model

import "time"

type DashboardWidgetType string

const (
	DashboardWidgetTypeGauge           DashboardWidgetType = "GAUGE"
	DashboardWidgetTypeLineChart       DashboardWidgetType = "LINE_CHART"
	DashboardWidgetTypeStatusIndicator DashboardWidgetType = "STATUS_INDICATOR"
	DashboardWidgetTypeStatCard        DashboardWidgetType = "STAT_CARD"
	DashboardWidgetTypeTable           DashboardWidgetType = "TABLE"
)

type DashboardLayout struct {
	ID                     string
	TenantID               string
	Name                   string
	Description            *string
	IsDefault              bool
	RefreshIntervalSeconds int
	Widgets                []*DashboardWidget
	CreatedAt              *time.Time
	UpdatedAt              *time.Time
}

type DashboardWidget struct {
	ID                string
	DashboardLayoutID string
	TenantID          string
	WidgetType        DashboardWidgetType
	Title             string
	GridX             int
	GridY             int
	GridCols          int
	GridRows          int
	DeviceID          *string
	MetricName        *string
	Config            map[string]interface{}
	CreatedAt         *time.Time
	UpdatedAt         *time.Time
}

type DashboardLayoutInput struct {
	Name                   string
	Description            *string
	IsDefault              *bool
	RefreshIntervalSeconds *int
}

type UpdateDashboardLayoutInput struct {
	Name                   *string
	Description            *string
	IsDefault              *bool
	RefreshIntervalSeconds *int
}

type DashboardWidgetInput struct {
	WidgetType DashboardWidgetType
	Title      string
	GridX      int
	GridY      int
	GridCols   int
	GridRows   int
	DeviceID   *string
	MetricName *string
	Config     map[string]interface{}
}

type UpdateDashboardWidgetInput struct {
	Title      *string
	GridX      *int
	GridY      *int
	GridCols   *int
	GridRows   *int
	DeviceID   *string
	MetricName *string
	Config     map[string]interface{}
}

type WidgetPositionInput struct {
	WidgetID string
	GridX    int
	GridY    int
	GridCols int
	GridRows int
}

func (l *DashboardLayoutInput) ToDashboardLayout(id, tenantID string) DashboardLayout {
	layout := DashboardLayout{
		ID:                     id,
		TenantID:               tenantID,
		Name:                   l.Name,
		Description:            l.Description,
		IsDefault:              false,
		RefreshIntervalSeconds: 30,
	}

	if l.IsDefault != nil {
		layout.IsDefault = *l.IsDefault
	}
	if l.RefreshIntervalSeconds != nil {
		layout.RefreshIntervalSeconds = *l.RefreshIntervalSeconds
	}

	return layout
}

func (w *DashboardWidgetInput) ToDashboardWidget(id, layoutID, tenantID string) DashboardWidget {
	return DashboardWidget{
		ID:                id,
		DashboardLayoutID: layoutID,
		TenantID:          tenantID,
		WidgetType:        w.WidgetType,
		Title:             w.Title,
		GridX:             w.GridX,
		GridY:             w.GridY,
		GridCols:          w.GridCols,
		GridRows:          w.GridRows,
		DeviceID:          w.DeviceID,
		MetricName:        w.MetricName,
		Config:            w.Config,
	}
}
