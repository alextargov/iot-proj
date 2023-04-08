package graphql

type Device struct {
	ID                 string       `json:"id"`
	Name               string       `json:"name"`
	Description        *string      `json:"description"`
	Status             DeviceStatus `json:"status"`
	TenantID           string       `json:"tenantId"`
	Host               Host         `json:"host"`
	CommunicationToken *string      `json:"communicationToken"`
	Auth               *Auth        `json:"auth"`
}
