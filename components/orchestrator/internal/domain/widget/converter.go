package widget

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"time"
)

type converter struct {
}

func NewConverter() *converter {
	return &converter{}
}

func (c *converter) ToEntity(model model.Widget) (*Entity, error) {
	return &Entity{
		ID:             model.ID,
		TenantID:       model.TenantID,
		Name:           model.Name,
		Description:    repo.NewNullableString(model.Description),
		Status:         string(model.Status),
		Schedule:       repo.NewNullableString(model.Schedule),
		LastExecutedAt: model.LastExecutedAt,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}, nil
}

// FromEntity converts database entity to model (without DeviceIDs - those are loaded separately)
func (c *converter) FromEntity(entity *Entity) (*model.Widget, error) {
	if entity == nil {
		return nil, nil
	}

	return &model.Widget{
		ID:             entity.ID,
		Name:           entity.Name,
		Description:    repo.StringPtrFromNullableString(entity.Description),
		TenantID:       entity.TenantID,
		Status:         model.WidgetStatus(entity.Status),
		DeviceIDs:      nil, // Will be populated by service layer
		Schedule:       repo.StringPtrFromNullableString(entity.Schedule),
		LastExecutedAt: entity.LastExecutedAt,
		CreatedAt:      entity.CreatedAt,
		UpdatedAt:      entity.UpdatedAt,
	}, nil
}

// FromEntityWithDeviceIDs converts database entity to model with provided device IDs
func (c *converter) FromEntityWithDeviceIDs(entity *Entity, deviceIDs []string) (*model.Widget, error) {
	if entity == nil {
		return nil, nil
	}

	return &model.Widget{
		ID:             entity.ID,
		Name:           entity.Name,
		Description:    repo.StringPtrFromNullableString(entity.Description),
		TenantID:       entity.TenantID,
		Status:         model.WidgetStatus(entity.Status),
		DeviceIDs:      deviceIDs,
		Schedule:       repo.StringPtrFromNullableString(entity.Schedule),
		LastExecutedAt: entity.LastExecutedAt,
		CreatedAt:      entity.CreatedAt,
		UpdatedAt:      entity.UpdatedAt,
	}, nil
}

func (c *converter) InputFromGraphQL(in graphql.WidgetInput) model.WidgetInput {
	return model.WidgetInput{
		Name:        in.Name,
		Description: in.Description,
		Status:      model.WidgetStatus(in.Status),
		Code:        in.Code,
		Workspace:   in.Workspace,
		DeviceIDs:   in.DeviceIds,
		Schedule:    in.Schedule,
	}
}

func timePtrToTimestampPtr(time *time.Time) *graphql.Timestamp {
	if time == nil {
		return nil
	}

	t := graphql.Timestamp(*time)
	return &t
}

func (c *converter) ToGraphQL(in *model.Widget) *graphql.Widget {
	return &graphql.Widget{
		ID:             in.ID,
		TenantID:       in.TenantID,
		Name:           in.Name,
		Description:    in.Description,
		Status:         graphql.WidgetStatus(in.Status),
		Code:           in.Code,
		Workspace:      in.Workspace,
		DeviceIds:      in.DeviceIDs,
		Schedule:       in.Schedule,
		LastExecutedAt: graphql.TimePtrToTimestampPtr(in.LastExecutedAt),
		CreatedAt:      graphql.TimePtrToTimestampPtr(in.CreatedAt),
		UpdatedAt:      graphql.TimePtrToTimestampPtr(in.UpdatedAt),
	}
}

func (c *converter) MultipleToGraphQL(in []*model.Widget) []*graphql.Widget {
	wdigets := make([]*graphql.Widget, 0, len(in))
	for _, r := range in {
		if r == nil {
			continue
		}

		wdigets = append(wdigets, c.ToGraphQL(r))
	}

	return wdigets
}
