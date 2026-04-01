package model

import "time"

// AlertSeverity represents the severity level of an alert
type AlertSeverity string

const (
	AlertSeverityInfo     AlertSeverity = "INFO"
	AlertSeverityWarning  AlertSeverity = "WARNING"
	AlertSeverityCritical AlertSeverity = "CRITICAL"
)

// AlertConditionOperator represents the comparison operator for conditions
type AlertConditionOperator string

const (
	AlertOperatorGT  AlertConditionOperator = "GT"
	AlertOperatorLT  AlertConditionOperator = "LT"
	AlertOperatorEQ  AlertConditionOperator = "EQ"
	AlertOperatorGTE AlertConditionOperator = "GTE"
	AlertOperatorLTE AlertConditionOperator = "LTE"
	AlertOperatorNE  AlertConditionOperator = "NE"
)

// AlertEventStatus represents the status of an alert event
type AlertEventStatus string

const (
	AlertEventStatusTriggered    AlertEventStatus = "TRIGGERED"
	AlertEventStatusResolved     AlertEventStatus = "RESOLVED"
	AlertEventStatusAcknowledged AlertEventStatus = "ACKNOWLEDGED"
)

// AlertRule represents an alert rule configuration
type AlertRule struct {
	ID              string
	TenantID        string
	DeviceID        string
	Name            string
	Description     *string
	Severity        AlertSeverity
	Enabled         bool
	CooldownMinutes int
	Conditions      []AlertConditionGroup
	Notifications   []AlertNotification
	LastTriggeredAt *time.Time
	CreatedAt       *time.Time
	UpdatedAt       *time.Time
}

// AlertConditionGroup represents a group of conditions that are ANDed together
type AlertConditionGroup struct {
	GroupID    int
	Conditions []AlertCondition
}

// AlertCondition represents a single condition in an alert rule
type AlertCondition struct {
	ID         string
	MetricName string
	Operator   AlertConditionOperator
	Threshold  float64
}

// AlertNotification represents a notification channel for an alert
type AlertNotification struct {
	ID     string
	Type   string // "email" or "webhook"
	Config string // JSON configuration
}

// AlertEvent represents a triggered alert event
type AlertEvent struct {
	ID              string
	AlertRuleID     string
	DeviceID        string
	TenantID        string
	TriggeredValues map[string]float64
	Status          AlertEventStatus
	TriggeredAt     time.Time
	ResolvedAt      *time.Time
	CreatedAt       *time.Time
}

// CreateAlertRuleInput represents input for creating a new alert rule
type CreateAlertRuleInput struct {
	DeviceID        string
	Name            string
	Description     *string
	Severity        *AlertSeverity
	CooldownMinutes *int
	Conditions      []AlertConditionInput
	Notifications   []AlertNotificationInput
}

// UpdateAlertRuleInput represents input for updating an alert rule
type UpdateAlertRuleInput struct {
	Name            *string
	Description     *string
	Severity        *AlertSeverity
	Enabled         *bool
	CooldownMinutes *int
	Conditions      []AlertConditionInput
	Notifications   []AlertNotificationInput
}

// AlertConditionInput represents input for creating an alert condition
type AlertConditionInput struct {
	GroupID    int
	MetricName string
	Operator   AlertConditionOperator
	Threshold  float64
}

// AlertNotificationInput represents input for creating a notification channel
type AlertNotificationInput struct {
	Type   string
	Config string
}

// AlertRulePage represents a paginated list of alert rules
type AlertRulePage struct {
	Data       []*AlertRule
	PageInfo   *PageInfo
	TotalCount int
}

// AlertEventPage represents a paginated list of alert events
type AlertEventPage struct {
	Data       []*AlertEvent
	PageInfo   *PageInfo
	TotalCount int
}

// EmailNotificationConfig represents email notification configuration
type EmailNotificationConfig struct {
	Recipients []string `json:"recipients"`
	Subject    string   `json:"subject,omitempty"`
}

// WebhookNotificationConfig represents webhook notification configuration
type WebhookNotificationConfig struct {
	URL     string            `json:"url"`
	Method  string            `json:"method,omitempty"` // defaults to POST
	Headers map[string]string `json:"headers,omitempty"`
}
