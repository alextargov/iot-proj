package model

import "time"

type WidgetStatus string

const (
	DeviceStatusInactive WidgetStatus = "INACTIVE"
	DeviceStatusActive   WidgetStatus = "ACTIVE"
)

type WidgetInput struct {
	Name        string
	Description *string
	Status      WidgetStatus
	Code        string
	Workspace   string
	DeviceIDs   []string
}

func (wi *WidgetInput) ToWidget(id string) Widget {
	return Widget{
		ID:          id,
		Name:        wi.Name,
		Description: wi.Description,
		Status:      wi.Status,
		Code:        wi.Code,
		Workspace:   wi.Workspace,
		DeviceIDs:   wi.DeviceIDs,
	}
}

type Widget struct {
	ID          string       `json:"id"`
	TenantID    string       `json:"tenantID"`
	Name        string       `json:"name"`
	Description *string      `json:"description"`
	Status      WidgetStatus `json:"status"`
	Code        string       `json:"code"`
	Workspace   string       `json:"workspace"`
	DeviceIDs   []string     `json:"devices"`
	CreatedAt   *time.Time   `json:"createdAt"`
	UpdatedAt   *time.Time   `json:"updatedAt"`
}
