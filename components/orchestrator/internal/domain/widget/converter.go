package widget

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/pkg/errors"
	"time"
)

type converter struct {
}

func NewConverter() *converter {
	return &converter{}
}

func (c *converter) ToEntity(model model.Widget) (*Entity, error) {
	deviceIDs, err := toDeviceIDsEntity(model)
	if err != nil {
		return nil, err
	}

	return &Entity{
		ID:          model.ID,
		TenantID:    model.TenantID,
		Name:        model.Name,
		Description: repo.NewNullableString(model.Description),
		Status:      string(model.Status),
		DeviceIDs:   deviceIDs,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
	}, nil
}

// FromEntity missing godoc
func (c *converter) FromEntity(entity *Entity) (*model.Widget, error) {
	if entity == nil {
		return nil, nil
	}

	deviceIDs, err := fromEntityDeviceIDs(*entity)
	if err != nil {
		return nil, err
	}

	return &model.Widget{
		ID:          entity.ID,
		Name:        entity.Name,
		Description: repo.StringPtrFromNullableString(entity.Description),
		TenantID:    entity.TenantID,
		Status:      model.WidgetStatus(entity.Status),
		DeviceIDs:   deviceIDs,
		CreatedAt:   entity.CreatedAt,
		UpdatedAt:   entity.UpdatedAt,
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
		ID:          in.ID,
		TenantID:    in.TenantID,
		Name:        in.Name,
		Description: in.Description,
		Status:      graphql.WidgetStatus(in.Status),
		Code:        in.Code,
		Workspace:   in.Workspace,
		DeviceIds:   in.DeviceIDs,
		CreatedAt:   graphql.TimePtrToTimestampPtr(in.CreatedAt),
		UpdatedAt:   graphql.TimePtrToTimestampPtr(in.UpdatedAt),
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

func toDeviceIDsEntity(in model.Widget) (sql.NullString, error) {
	var optionalAuth sql.NullString
	if in.DeviceIDs == nil {
		return optionalAuth, nil
	}

	b, err := json.Marshal(in.DeviceIDs)
	if err != nil {
		return sql.NullString{}, errors.Wrap(err, "while marshalling DeviceIDs")
	}

	if err := optionalAuth.Scan(b); err != nil {
		return sql.NullString{}, errors.Wrap(err, "while scanning optional DeviceIDs")
	}
	return optionalAuth, nil
}

func fromEntityDeviceIDs(in Entity) ([]string, error) {
	if !in.DeviceIDs.Valid {
		return nil, nil
	}

	var deviceIDs []string
	val, err := in.DeviceIDs.Value()
	if err != nil {
		return nil, errors.Wrap(err, "while reading DeviceIDs from Entity")
	}

	b, ok := val.(string)
	if !ok {
		return nil, errors.New("DeviceIDs should be slice of bytes")
	}

	fmt.Println("ALEX", b)

	if err := json.Unmarshal([]byte(b), &deviceIDs); err != nil {
		return nil, errors.Wrap(err, "while unmarshaling DeviceIDs")
	}

	return deviceIDs, nil
}
