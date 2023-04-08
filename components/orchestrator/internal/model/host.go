package model

type HostInput struct {
	Url             string
	TurnOnEndpoint  *string
	TurnOffEndpoint *string
}

func (hi *HostInput) ToHost(id string) Host {
	return Host{
		ID:              id,
		Url:             hi.Url,
		TurnOnEndpoint:  hi.TurnOnEndpoint,
		TurnOffEndpoint: hi.TurnOffEndpoint,
	}
}

type Host struct {
	ID              string  `json:"id"`
	Url             string  `json:"url"`
	TurnOnEndpoint  *string `json:"turnOnEndpoint"`
	TurnOffEndpoint *string `json:"turnOffEndpoint"`
}
