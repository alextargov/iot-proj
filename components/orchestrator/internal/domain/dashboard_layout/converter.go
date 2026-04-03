package dashboard_layout

import (
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type Converter struct{}

func NewConverter() *Converter {
	return &Converter{}
}

func (c *Converter) ToEntity(m model.DashboardLayout) (*Entity, error) {
	return &Entity{
		ID:                     m.ID,
		TenantID:               m.TenantID,
		Name:                   m.Name,
		Description:            repo.NewNullableString(m.Description),
		IsDefault:              m.IsDefault,
		RefreshIntervalSeconds: m.RefreshIntervalSeconds,
		CreatedAt:              m.CreatedAt,
	}, nil
}

func (c *Converter) FromEntity(e *Entity) (*model.DashboardLayout, error) {
	if e == nil {
		return nil, nil
	}

	var updatedAt *time.Time
	if e.UpdatedAt.Valid {
		updatedAt = &e.UpdatedAt.Time
	}

	return &model.DashboardLayout{
		ID:                     e.ID,
		TenantID:               e.TenantID,
		Name:                   e.Name,
		Description:            repo.StringPtrFromNullableString(e.Description),
		IsDefault:              e.IsDefault,
		RefreshIntervalSeconds: e.RefreshIntervalSeconds,
		Widgets:                nil, // Populated separately by service
		CreatedAt:              e.CreatedAt,
		UpdatedAt:              updatedAt,
	}, nil
}

func (c *Converter) ToGraphQL(m *model.DashboardLayout, widgets []*graphql.DashboardWidget) *graphql.DashboardLayout {
	if m == nil {
		return nil
	}

	return &graphql.DashboardLayout{
		ID:                     m.ID,
		TenantID:               m.TenantID,
		Name:                   m.Name,
		Description:            m.Description,
		IsDefault:              m.IsDefault,
		RefreshIntervalSeconds: m.RefreshIntervalSeconds,
		Widgets:                widgets,
		CreatedAt:              graphql.TimePtrToTimestampPtr(m.CreatedAt),
		UpdatedAt:              graphql.TimePtrToTimestampPtr(m.UpdatedAt),
	}
}

func (c *Converter) MultipleToGraphQL(layouts []*model.DashboardLayout, widgetsByLayout map[string][]*graphql.DashboardWidget) []*graphql.DashboardLayout {
	result := make([]*graphql.DashboardLayout, 0, len(layouts))
	for _, l := range layouts {
		if l != nil {
			widgets := widgetsByLayout[l.ID]
			result = append(result, c.ToGraphQL(l, widgets))
		}
	}
	return result
}

func (c *Converter) InputFromGraphQL(in graphql.DashboardLayoutInput) model.DashboardLayoutInput {
	return model.DashboardLayoutInput{
		Name:                   in.Name,
		Description:            in.Description,
		IsDefault:              in.IsDefault,
		RefreshIntervalSeconds: in.RefreshIntervalSeconds,
	}
}

func (c *Converter) UpdateInputFromGraphQL(in graphql.UpdateDashboardLayoutInput) model.UpdateDashboardLayoutInput {
	return model.UpdateDashboardLayoutInput{
		Name:                   in.Name,
		Description:            in.Description,
		IsDefault:              in.IsDefault,
		RefreshIntervalSeconds: in.RefreshIntervalSeconds,
	}
}
