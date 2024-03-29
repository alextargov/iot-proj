package device

import (
	"database/sql"
	"encoding/json"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/pkg/errors"
	"time"
)

type hostConv interface {
	InputFromGraphQL(in *graphql.HostInput) *model.HostInput
	ToGraphQL(in *model.Host) *graphql.Host
}

type authConv interface {
	ToGraphQL(in *model.Auth) *graphql.Auth
	InputFromGraphQL(in *graphql.AuthInput) *model.AuthInput
}

type converter struct {
	hostConv hostConv
	authConv authConv
}

func NewConverter(hostConv hostConv, authConv authConv) *converter {
	return &converter{
		hostConv: hostConv,
		authConv: authConv,
	}
}

func (c *converter) ToEntity(model model.Device) (*Entity, error) {
	optionalAuth, err := c.toAuthEntity(model)
	if err != nil {
		return nil, err
	}

	return &Entity{
		ID:          model.ID,
		TenantID:    model.TenantID,
		Name:        model.Name,
		Description: repo.NewNullableString(model.Description),
		Status:      string(model.Status),
		Auth:        optionalAuth,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
	}, nil
}

// FromEntity missing godoc
func (c *converter) FromEntity(entity *Entity) (*model.Device, error) {
	if entity == nil {
		return nil, nil
	}

	auth, err := c.fromEntityAuth(*entity)
	if err != nil {
		return nil, err
	}

	return &model.Device{
		ID:          entity.ID,
		Name:        entity.Name,
		Description: repo.StringPtrFromNullableString(entity.Description),
		TenantID:    entity.TenantID,
		Status:      model.DeviceStatus(entity.Status),
		Auth:        auth,
		CreatedAt:   entity.CreatedAt,
		UpdatedAt:   entity.UpdatedAt,
	}, nil
}

func (c *converter) InputFromGraphQL(in graphql.DeviceInput) model.DeviceInput {
	return model.DeviceInput{
		Name:        in.Name,
		Description: in.Description,
		Status:      model.DeviceStatus(in.Status),
		Host:        c.hostConv.InputFromGraphQL(in.Host),
		Auth:        c.authConv.InputFromGraphQL(in.Auth),
	}
}

func timePtrToTimestampPtr(time *time.Time) *graphql.Timestamp {
	if time == nil {
		return nil
	}

	t := graphql.Timestamp(*time)
	return &t
}

func (c *converter) ToGraphQL(in *model.Device) *graphql.Device {
	return &graphql.Device{
		ID:          in.ID,
		TenantID:    in.TenantID,
		Name:        in.Name,
		Description: in.Description,
		Status:      graphql.DeviceStatus(in.Status),
		Host:        c.hostConv.ToGraphQL(in.Host),
		Auth:        c.authConv.ToGraphQL(in.Auth),
		CreatedAt:   graphql.TimePtrToTimestampPtr(in.CreatedAt),
		UpdatedAt:   graphql.TimePtrToTimestampPtr(in.UpdatedAt),
	}
}

func (c *converter) MultipleToGraphQL(in []*model.Device) []*graphql.Device {
	devices := make([]*graphql.Device, 0, len(in))
	for _, r := range in {
		if r == nil {
			continue
		}

		devices = append(devices, c.ToGraphQL(r))
	}

	return devices
}

func (c *converter) toAuthEntity(in model.Device) (sql.NullString, error) {
	var optionalAuth sql.NullString
	if in.Auth == nil {
		return optionalAuth, nil
	}

	b, err := json.Marshal(in.Auth)
	if err != nil {
		return sql.NullString{}, errors.Wrap(err, "while marshalling Auth")
	}

	if err := optionalAuth.Scan(b); err != nil {
		return sql.NullString{}, errors.Wrap(err, "while scanning optional Auth")
	}
	return optionalAuth, nil
}

func (c *converter) fromEntityAuth(in Entity) (*model.Auth, error) {
	if !in.Auth.Valid {
		return nil, nil
	}

	auth := &model.Auth{}
	val, err := in.Auth.Value()
	if err != nil {
		return nil, errors.Wrap(err, "while reading Auth from Entity")
	}

	b, ok := val.(string)
	if !ok {
		return nil, errors.New("Auth should be slice of bytes")
	}
	if err := json.Unmarshal([]byte(b), auth); err != nil {
		return nil, errors.Wrap(err, "while unmarshaling Auth")
	}

	return auth, nil
}
