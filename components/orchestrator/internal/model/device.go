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
	Tags               []string
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
		Tags:               di.Tags,
	}
}

type UpdateDeviceInput struct {
	Name        *string
	Description *string
	Status      *DeviceStatus
	Host        *HostInput
	Auth        *AuthInput
	DataModel   *string
	Tags        []string
}

// ToModel applies non-nil fields from the update input to an existing device
func (udi *UpdateDeviceInput) ToModel(device *Device) {
	if udi.Name != nil {
		device.Name = *udi.Name
	}
	if udi.Description != nil {
		device.Description = udi.Description
	}
	if udi.Status != nil {
		device.Status = *udi.Status
	}
	if udi.Auth != nil {
		device.Auth = udi.Auth.ToAuth()
	}
	if udi.DataModel != nil {
		device.DataModelID = *udi.DataModel
	}
	if udi.Tags != nil {
		device.Tags = udi.Tags
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
	Tags               []string     `json:"tags"`
	CreatedAt          *time.Time   `json:"createdAt"`
	UpdatedAt          *time.Time   `json:"updatedAt"`
}
