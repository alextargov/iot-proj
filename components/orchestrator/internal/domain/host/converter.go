package host

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct {
}

func NewConverter() *converter {
	return &converter{}
}

func (c *converter) InputFromGraphQL(in *graphql.HostInput) *model.HostInput {
	if in == nil {
		return nil
	}

	return &model.HostInput{
		Url:             in.URL,
		TurnOnEndpoint:  in.TurnOnEndpoint,
		TurnOffEndpoint: in.TurnOnEndpoint,
	}
}

// FromEntity missing godoc
func (c *converter) FromEntity(entity *Entity) *model.Host {
	if entity == nil {
		return nil
	}

	return &model.Host{
		ID:              entity.ID,
		Url:             entity.Url,
		TurnOffEndpoint: repo.StringPtrFromNullableString(entity.TurnOffEndpoint),
		TurnOnEndpoint:  repo.StringPtrFromNullableString(entity.TurnOnEndpoint),
	}
}

// ToEntity missing godoc
func (c *converter) ToEntity(host model.Host) *Entity {
	return &Entity{
		ID:              host.ID,
		DeviceID:        host.DeviceID,
		Url:             host.Url,
		TurnOnEndpoint:  repo.NewNullableString(host.TurnOnEndpoint),
		TurnOffEndpoint: repo.NewNullableString(host.TurnOffEndpoint),
	}
}

func (c *converter) ToGraphQL(in *model.Host) *graphql.Host {
	if in == nil {
		return nil
	}

	return &graphql.Host{
		ID:              in.ID,
		URL:             in.Url,
		TurnOnEndpoint:  in.TurnOnEndpoint,
		TurnOffEndpoint: in.TurnOffEndpoint,
	}
}
