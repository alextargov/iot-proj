package model

import "time"

// IntegrationType enumerates the supported external-service connector kinds.
type IntegrationType string

const (
	IntegrationTypeWebhook       IntegrationType = "WEBHOOK"
	IntegrationTypeIFTTT         IntegrationType = "IFTTT"
	IntegrationTypeHomeAssistant IntegrationType = "HOME_ASSISTANT"
	IntegrationTypeGenericHTTP   IntegrationType = "GENERIC_HTTP"
)

// Integration is a named connection to an external service. The outbound call
// is an authenticated HTTP request to Endpoint; AuthToken (optional) is sent as
// a Bearer token, and Config carries connector-specific JSON (e.g. IFTTT event
// name, Home Assistant entity id).
type Integration struct {
	ID        string
	TenantID  string
	Name      string
	Type      IntegrationType
	Endpoint  string
	AuthToken *string
	Config    *string // JSON
	Enabled   bool
	CreatedAt *time.Time
	UpdatedAt *time.Time
}

// CreateIntegrationInput is the input for creating an integration.
type CreateIntegrationInput struct {
	Name      string
	Type      IntegrationType
	Endpoint  string
	AuthToken *string
	Config    *string
}

// UpdateIntegrationInput is the input for updating an integration.
type UpdateIntegrationInput struct {
	Name      *string
	Endpoint  *string
	AuthToken *string
	Config    *string
	Enabled   *bool
}
