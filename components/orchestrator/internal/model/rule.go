package model

import "time"

// RuleConditionOperator represents the comparison operator for rule conditions.
// It mirrors AlertConditionOperator (GT/LT/EQ/GTE/LTE/NE).
type RuleConditionOperator string

const (
	RuleOperatorGT  RuleConditionOperator = "GT"
	RuleOperatorLT  RuleConditionOperator = "LT"
	RuleOperatorEQ  RuleConditionOperator = "EQ"
	RuleOperatorGTE RuleConditionOperator = "GTE"
	RuleOperatorLTE RuleConditionOperator = "LTE"
	RuleOperatorNE  RuleConditionOperator = "NE"
)

// RuleActionType represents the kind of action a rule performs when it fires.
type RuleActionType string

const (
	// RuleActionDeviceOperation sends a TURN_ON/TURN_OFF command to a device.
	RuleActionDeviceOperation RuleActionType = "DEVICE_OPERATION"
	// RuleActionNotification sends an email/webhook notification.
	RuleActionNotification RuleActionType = "NOTIFICATION"
	// RuleActionDelay waits for a number of seconds before the next action.
	RuleActionDelay RuleActionType = "DELAY"
	// RuleActionIntegration invokes a configured external-service integration.
	RuleActionIntegration RuleActionType = "INTEGRATION"
)

// AutomationRule is a visual IF-THEN automation: WHEN <conditions> THEN
// <ordered actions>. Conditions reuse the alert grouping semantics (AND within
// a group, OR across groups). Actions run in seq_order when the rule fires.
type AutomationRule struct {
	ID              string
	TenantID        string
	DeviceID        string
	Name            string
	Description     *string
	Enabled         bool
	CooldownSeconds int
	Conditions      []RuleConditionGroup
	Actions         []RuleAction
	LastTriggeredAt *time.Time
	CreatedAt       *time.Time
	UpdatedAt       *time.Time
}

// RuleConditionGroup is a set of conditions ANDed together.
type RuleConditionGroup struct {
	GroupID    int
	Conditions []RuleCondition
}

// RuleCondition is a single WHEN comparison.
type RuleCondition struct {
	ID         string
	MetricName string
	Operator   RuleConditionOperator
	Threshold  float64
}

// RuleAction is a single THEN step. Fields are interpreted based on Type:
//   - DEVICE_OPERATION: TargetDeviceID (falls back to the rule's device) + Operation
//   - NOTIFICATION:     NotificationType ("email"/"webhook") + NotificationConfig (JSON)
//   - DELAY:            DelaySeconds
//   - INTEGRATION:      IntegrationID (the integration to invoke)
type RuleAction struct {
	ID                 string
	SeqOrder           int
	Type               RuleActionType
	TargetDeviceID     *string
	Operation          *string
	NotificationType   *string
	NotificationConfig *string
	IntegrationID      *string
	DelaySeconds       int
}

// ==================== Inputs ====================

type CreateAutomationRuleInput struct {
	DeviceID        string
	Name            string
	Description     *string
	CooldownSeconds *int
	Conditions      []RuleConditionInput
	Actions         []RuleActionInput
}

type UpdateAutomationRuleInput struct {
	Name            *string
	Description     *string
	Enabled         *bool
	CooldownSeconds *int
	Conditions      []RuleConditionInput
	Actions         []RuleActionInput
}

type RuleConditionInput struct {
	GroupID    int
	MetricName string
	Operator   RuleConditionOperator
	Threshold  float64
}

type RuleActionInput struct {
	SeqOrder           int
	Type               RuleActionType
	TargetDeviceID     *string
	Operation          *string
	NotificationType   *string
	NotificationConfig *string
	IntegrationID      *string
	DelaySeconds       *int
}

// AutomationRulePage is a paginated list of automation rules.
type AutomationRulePage struct {
	Data       []*AutomationRule
	PageInfo   *PageInfo
	TotalCount int
}
