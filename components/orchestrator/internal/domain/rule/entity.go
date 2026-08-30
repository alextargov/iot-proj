package rule

import (
	"database/sql"
	"time"
)

// RuleEntity is the DB entity for automation_rules.
type RuleEntity struct {
	ID              string         `db:"id"`
	TenantID        string         `db:"tenant_id"`
	DeviceID        string         `db:"device_id"`
	Name            string         `db:"name"`
	Description     sql.NullString `db:"description"`
	Enabled         bool           `db:"enabled"`
	CooldownSeconds int            `db:"cooldown_seconds"`
	LastTriggeredAt sql.NullTime   `db:"last_triggered_at"`
	CreatedAt       *time.Time     `db:"created_at"`
	UpdatedAt       sql.NullTime   `db:"updated_at"`
}

// RuleEntityCollection is a slice of rule entities.
type RuleEntityCollection []RuleEntity

// Len returns the length of the collection.
func (c RuleEntityCollection) Len() int { return len(c) }

// ConditionEntity is the DB entity for rule_conditions.
type ConditionEntity struct {
	ID         string     `db:"id"`
	RuleID     string     `db:"rule_id"`
	GroupID    int        `db:"group_id"`
	MetricName string     `db:"metric_name"`
	Operator   string     `db:"operator"`
	Threshold  float64    `db:"threshold"`
	CreatedAt  *time.Time `db:"created_at"`
}

// ConditionEntityCollection is a slice of condition entities.
type ConditionEntityCollection []ConditionEntity

// Len returns the length of the collection.
func (c ConditionEntityCollection) Len() int { return len(c) }

// ActionEntity is the DB entity for rule_actions.
type ActionEntity struct {
	ID                 string         `db:"id"`
	RuleID             string         `db:"rule_id"`
	SeqOrder           int            `db:"seq_order"`
	ActionType         string         `db:"action_type"`
	TargetDeviceID     sql.NullString `db:"target_device_id"`
	Operation          sql.NullString `db:"operation"`
	NotificationType   sql.NullString `db:"notification_type"`
	NotificationConfig sql.NullString `db:"notification_config"`
	IntegrationID      sql.NullString `db:"integration_id"`
	DelaySeconds       int            `db:"delay_seconds"`
	CreatedAt          *time.Time     `db:"created_at"`
}

// ActionEntityCollection is a slice of action entities.
type ActionEntityCollection []ActionEntity

// Len returns the length of the collection.
func (c ActionEntityCollection) Len() int { return len(c) }
