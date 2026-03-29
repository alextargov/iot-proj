package graphql

type Device struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description *string      `json:"description"`
	Status      DeviceStatus `json:"status"`
	TenantID    string       `json:"tenantId"`
	Host        *Host        `json:"host"`
	Auth        *Auth        `json:"auth"`
	DataModelID string       `json:"dataModelId"`
	CreatedAt   *Timestamp   `json:"createdAt"`
	UpdatedAt   *Timestamp   `json:"updatedAt"`
}
