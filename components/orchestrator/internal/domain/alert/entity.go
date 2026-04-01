package alert

import (
	"database/sql"
	"time"
)

// RuleEntity represents the database entity for alert rules
type RuleEntity struct {
	ID              string         `db:"id"`
	TenantID        string         `db:"tenant_id"`
	DeviceID        string         `db:"device_id"`
	Name            string         `db:"name"`
	Description     sql.NullString `db:"description"`
	Severity        string         `db:"severity"`
	Enabled         bool           `db:"enabled"`
	CooldownMinutes int            `db:"cooldown_minutes"`
	LastTriggeredAt sql.NullTime   `db:"last_triggered_at"`
	CreatedAt       *time.Time     `db:"created_at"`
	UpdatedAt       sql.NullTime   `db:"updated_at"`
}

// RuleEntityCollection represents a collection of rule entities
type RuleEntityCollection []RuleEntity

// Len returns the length of the collection
func (c RuleEntityCollection) Len() int {
	return len(c)
}

// ConditionEntity represents the database entity for alert conditions
type ConditionEntity struct {
	ID          string     `db:"id"`
	AlertRuleID string     `db:"alert_rule_id"`
	GroupID     int        `db:"group_id"`
	MetricName  string     `db:"metric_name"`
	Operator    string     `db:"operator"`
	Threshold   float64    `db:"threshold"`
	CreatedAt   *time.Time `db:"created_at"`
}

// ConditionEntityCollection represents a collection of condition entities
type ConditionEntityCollection []ConditionEntity

// Len returns the length of the collection
func (c ConditionEntityCollection) Len() int {
	return len(c)
}

// NotificationEntity represents the database entity for alert notifications
type NotificationEntity struct {
	ID          string     `db:"id"`
	AlertRuleID string     `db:"alert_rule_id"`
	Type        string     `db:"type"`
	Config      string     `db:"config"` // JSON stored as string
	CreatedAt   *time.Time `db:"created_at"`
}

// NotificationEntityCollection represents a collection of notification entities
type NotificationEntityCollection []NotificationEntity

// Len returns the length of the collection
func (c NotificationEntityCollection) Len() int {
	return len(c)
}

// EventEntity represents the database entity for alert events
type EventEntity struct {
	ID              string       `db:"id"`
	AlertRuleID     string       `db:"alert_rule_id"`
	DeviceID        string       `db:"device_id"`
	TenantID        string       `db:"tenant_id"`
	TriggeredValues string       `db:"triggered_values"` // JSON stored as string
	Status          string       `db:"status"`
	TriggeredAt     time.Time    `db:"triggered_at"`
	ResolvedAt      sql.NullTime `db:"resolved_at"`
	CreatedAt       *time.Time   `db:"created_at"`
}

// EventEntityCollection represents a collection of event entities
type EventEntityCollection []EventEntity

// Len returns the length of the collection
func (c EventEntityCollection) Len() int {
	return len(c)
}
