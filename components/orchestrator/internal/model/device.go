package model

import "time"

type DeviceStatus string

const (
	DeviceStatusInitial     DeviceStatus = "INITIAL"
	DeviceStatusACTIVE      DeviceStatus = "ACTIVE"
	DeviceStatusUnreachable DeviceStatus = "UNREACHABLE"
	DeviceStatusError       DeviceStatus = "ERROR"
)

type DeviceInput struct {
	Name               string
	Description        *string
	Status             DeviceStatus
	Host               *HostInput
	CommunicationToken *string
	Auth               *AuthInput
	DataModel          string
}

func (di *DeviceInput) ToDevice(id string) Device {
	return Device{
		ID:                 id,
		Name:               di.Name,
		Description:        di.Description,
		Status:             di.Status,
		CommunicationToken: di.CommunicationToken,
		Auth:               di.Auth.ToAuth(),
		DataModelID:        di.DataModel,
	}
}

type Device struct {
	ID                 string       `json:"id"`
	TenantID           string       `json:"tenantID"`
	Name               string       `json:"name"`
	Description        *string      `json:"description"`
	Status             DeviceStatus `json:"status"`
	Host               *Host        `json:"host"`
	CommunicationToken *string      `json:"communicationToken"`
	Auth               *Auth        `json:"auth"`
	DataModelID        string       `json:"dataModelID"`
	CreatedAt          *time.Time   `json:"createdAt"`
	UpdatedAt          *time.Time   `json:"updatedAt"`
}
