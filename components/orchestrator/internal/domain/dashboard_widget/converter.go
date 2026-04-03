package dashboard_widget

import (
	"encoding/json"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type Converter struct{}

func NewConverter() *Converter {
	return &Converter{}
}

func (c *Converter) ToEntity(m model.DashboardWidget) (*Entity, error) {
	configJSON, err := json.Marshal(m.Config)
	if err != nil {
		return nil, err
	}

	return &Entity{
		ID:                m.ID,
		DashboardLayoutID: m.DashboardLayoutID,
		TenantID:          m.TenantID,
		WidgetType:        string(m.WidgetType),
		Title:             m.Title,
		GridX:             m.GridX,
		GridY:             m.GridY,
		GridCols:          m.GridCols,
		GridRows:          m.GridRows,
		DeviceID:          repo.NewNullableString(m.DeviceID),
		MetricName:        repo.NewNullableString(m.MetricName),
		Config:            string(configJSON),
		CreatedAt:         m.CreatedAt,
	}, nil
}

func (c *Converter) FromEntity(e *Entity) (*model.DashboardWidget, error) {
	if e == nil {
		return nil, nil
	}

	var config map[string]interface{}
	if e.Config != "" {
		if err := json.Unmarshal([]byte(e.Config), &config); err != nil {
			config = make(map[string]interface{})
		}
	}

	var updatedAt *time.Time
	if e.UpdatedAt.Valid {
		updatedAt = &e.UpdatedAt.Time
	}

	return &model.DashboardWidget{
		ID:                e.ID,
		DashboardLayoutID: e.DashboardLayoutID,
		TenantID:          e.TenantID,
		WidgetType:        model.DashboardWidgetType(e.WidgetType),
		Title:             e.Title,
		GridX:             e.GridX,
		GridY:             e.GridY,
		GridCols:          e.GridCols,
		GridRows:          e.GridRows,
		DeviceID:          repo.StringPtrFromNullableString(e.DeviceID),
		MetricName:        repo.StringPtrFromNullableString(e.MetricName),
		Config:            config,
		CreatedAt:         e.CreatedAt,
		UpdatedAt:         updatedAt,
	}, nil
}

func (c *Converter) ToGraphQL(m *model.DashboardWidget) *graphql.DashboardWidget {
	if m == nil {
		return nil
	}

	configJSON, _ := json.Marshal(m.Config)

	return &graphql.DashboardWidget{
		ID:                m.ID,
		DashboardLayoutID: m.DashboardLayoutID,
		WidgetType:        graphql.DashboardWidgetType(m.WidgetType),
		Title:             m.Title,
		GridX:             m.GridX,
		GridY:             m.GridY,
		GridCols:          m.GridCols,
		GridRows:          m.GridRows,
		MetricName:        m.MetricName,
		Config:            graphql.JSON(configJSON),
		CreatedAt:         graphql.TimePtrToTimestampPtr(m.CreatedAt),
		UpdatedAt:         graphql.TimePtrToTimestampPtr(m.UpdatedAt),
	}
}

func (c *Converter) MultipleToGraphQL(widgets []*model.DashboardWidget) []*graphql.DashboardWidget {
	result := make([]*graphql.DashboardWidget, 0, len(widgets))
	for _, w := range widgets {
		if w != nil {
			result = append(result, c.ToGraphQL(w))
		}
	}
	return result
}

func (c *Converter) InputFromGraphQL(in graphql.DashboardWidgetInput) model.DashboardWidgetInput {
	var config map[string]interface{}
	if in.Config != "" {
		json.Unmarshal([]byte(in.Config), &config)
	}

	return model.DashboardWidgetInput{
		WidgetType: model.DashboardWidgetType(in.WidgetType),
		Title:      in.Title,
		GridX:      in.GridX,
		GridY:      in.GridY,
		GridCols:   in.GridCols,
		GridRows:   in.GridRows,
		DeviceID:   in.DeviceID,
		MetricName: in.MetricName,
		Config:     config,
	}
}

func (c *Converter) UpdateInputFromGraphQL(in graphql.UpdateDashboardWidgetInput) model.UpdateDashboardWidgetInput {
	var config map[string]interface{}
	if in.Config != nil && *in.Config != "" {
		json.Unmarshal([]byte(*in.Config), &config)
	}

	return model.UpdateDashboardWidgetInput{
		Title:      in.Title,
		GridX:      in.GridX,
		GridY:      in.GridY,
		GridCols:   in.GridCols,
		GridRows:   in.GridRows,
		DeviceID:   in.DeviceID,
		MetricName: in.MetricName,
		Config:     config,
	}
}

func (c *Converter) PositionsFromGraphQL(positions []*graphql.WidgetPositionInput) []model.WidgetPositionInput {
	result := make([]model.WidgetPositionInput, 0, len(positions))
	for _, p := range positions {
		result = append(result, model.WidgetPositionInput{
			WidgetID: p.WidgetID,
			GridX:    p.GridX,
			GridY:    p.GridY,
			GridCols: p.GridCols,
			GridRows: p.GridRows,
		})
	}
	return result
}
