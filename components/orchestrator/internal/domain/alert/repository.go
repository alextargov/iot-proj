package alert

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	ruleTableName         = "public.alert_rules"
	conditionTableName    = "public.alert_conditions"
	notificationTableName = "public.alert_notifications"
	eventTableName        = "public.alert_events"
	tenantColumn          = "tenant_id"
)

var (
	ruleColumns         = []string{"id", "tenant_id", "device_id", "name", "description", "severity", "enabled", "cooldown_minutes", "last_triggered_at", "created_at", "updated_at"}
	conditionColumns    = []string{"id", "alert_rule_id", "group_id", "metric_name", "operator", "threshold", "created_at"}
	notificationColumns = []string{"id", "alert_rule_id", "type", "config", "created_at"}
	eventColumns        = []string{"id", "alert_rule_id", "device_id", "tenant_id", "triggered_values", "status", "triggered_at", "resolved_at", "created_at"}
)

// RuleEntityConverter defines the interface for rule entity conversion
type RuleEntityConverter interface {
	RuleToEntity(model model.AlertRule) *RuleEntity
	RuleFromEntity(entity *RuleEntity) *model.AlertRule
	MultipleRulesFromEntity(entities RuleEntityCollection) []*model.AlertRule
	ConditionToEntity(model model.AlertCondition, ruleID string, groupID int) *ConditionEntity
	GroupConditionsFromEntities(entities ConditionEntityCollection) []model.AlertConditionGroup
	NotificationToEntity(model model.AlertNotification, ruleID string) *NotificationEntity
	MultipleNotificationsFromEntity(entities NotificationEntityCollection) []model.AlertNotification
	EventToEntity(model model.AlertEvent) *EventEntity
	EventFromEntity(entity *EventEntity) *model.AlertEvent
	MultipleEventsFromEntity(entities EventEntityCollection) []*model.AlertEvent
}

type repository struct {
	ruleCreator  repo.Creator
	ruleLister   repo.Lister
	ruleGetter   repo.SingleGetter
	ruleDeleter  repo.Deleter
	eventCreator repo.CreatorGlobal
	conv         RuleEntityConverter
}

// NewRepository creates a new alert repository
func NewRepository(converter RuleEntityConverter) *repository {
	return &repository{
		ruleCreator:  repo.NewCreator(ruleTableName, ruleColumns),
		ruleLister:   repo.NewLister(ruleTableName, ruleColumns),
		ruleGetter:   repo.NewSingleGetter(ruleTableName, ruleColumns),
		ruleDeleter:  repo.NewDeleter(ruleTableName),
		eventCreator: repo.NewCreatorGlobal(resource.AlertEvent, eventTableName, eventColumns),
		conv:         converter,
	}
}

// CreateRule creates a new alert rule
func (r *repository) CreateRule(ctx context.Context, rule model.AlertRule) error {
	entity := r.conv.RuleToEntity(rule)

	now := time.Now()
	entity.CreatedAt = &now

	logger.C(ctx).Debugf("Persisting AlertRule entity with id %s to db", rule.ID)
	return r.ruleCreator.Create(ctx, resource.AlertRule, entity)
}

// GetRuleByID retrieves an alert rule by ID
func (r *repository) GetRuleByID(ctx context.Context, id string) (*model.AlertRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	var entity RuleEntity
	if err := r.ruleGetter.Get(ctx, resource.AlertRule, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	rule := r.conv.RuleFromEntity(&entity)

	// Load conditions
	conditions, err := r.getConditionsForRule(ctx, id)
	if err != nil {
		return nil, err
	}
	rule.Conditions = conditions

	// Load notifications
	notifications, err := r.getNotificationsForRule(ctx, id)
	if err != nil {
		return nil, err
	}
	rule.Notifications = notifications

	return rule, nil
}

// GetRulesByDeviceID retrieves all alert rules for a device
func (r *repository) GetRulesByDeviceID(ctx context.Context, deviceID string) ([]*model.AlertRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	var entities RuleEntityCollection
	if err := r.ruleLister.List(ctx, resource.AlertRule, tnt, &entities, repo.NewEqualCondition("device_id", deviceID)); err != nil {
		return nil, err
	}

	rules := r.conv.MultipleRulesFromEntity(entities)

	// Load conditions and notifications for each rule
	for _, rule := range rules {
		conditions, err := r.getConditionsForRule(ctx, rule.ID)
		if err != nil {
			return nil, err
		}
		rule.Conditions = conditions

		notifications, err := r.getNotificationsForRule(ctx, rule.ID)
		if err != nil {
			return nil, err
		}
		rule.Notifications = notifications
	}

	return rules, nil
}

// GetEnabledRulesForDevice retrieves enabled alert rules for a device (used by evaluator)
func (r *repository) GetEnabledRulesForDevice(ctx context.Context, deviceID string) ([]*model.AlertRule, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE device_id = $1 AND enabled = true",
		strings.Join(ruleColumns, ", "),
		ruleTableName)

	var entities RuleEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, deviceID); err != nil {
		return nil, err
	}

	rules := r.conv.MultipleRulesFromEntity(entities)

	// Load conditions and notifications for each rule
	for _, rule := range rules {
		conditions, err := r.getConditionsForRule(ctx, rule.ID)
		if err != nil {
			return nil, err
		}
		rule.Conditions = conditions

		notifications, err := r.getNotificationsForRule(ctx, rule.ID)
		if err != nil {
			return nil, err
		}
		rule.Notifications = notifications
	}

	return rules, nil
}

// GetRulesByTenant retrieves all alert rules for a tenant with pagination
func (r *repository) GetRulesByTenant(ctx context.Context, first *int, after *string) ([]*model.AlertRule, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, 0, err
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total
	countStmt := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE tenant_id = $1", ruleTableName)
	var totalCount int
	if err := persist.GetContext(ctx, &totalCount, countStmt, tnt); err != nil {
		return nil, 0, err
	}

	// Build query
	limit := 20
	if first != nil && *first > 0 {
		limit = *first
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2",
		strings.Join(ruleColumns, ", "),
		ruleTableName)

	var entities RuleEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, tnt, limit); err != nil {
		return nil, 0, err
	}

	rules := r.conv.MultipleRulesFromEntity(entities)

	// Load conditions and notifications for each rule
	for _, rule := range rules {
		conditions, err := r.getConditionsForRule(ctx, rule.ID)
		if err != nil {
			return nil, 0, err
		}
		rule.Conditions = conditions

		notifications, err := r.getNotificationsForRule(ctx, rule.ID)
		if err != nil {
			return nil, 0, err
		}
		rule.Notifications = notifications
	}

	return rules, totalCount, nil
}

// UpdateRule updates an alert rule
func (r *repository) UpdateRule(ctx context.Context, rule model.AlertRule) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	stmt := fmt.Sprintf(`UPDATE %s SET
		name = $1,
		description = $2,
		severity = $3,
		enabled = $4,
		cooldown_minutes = $5,
		updated_at = $6
		WHERE id = $7`, ruleTableName)

	_, err = persist.ExecContext(ctx, stmt,
		rule.Name,
		rule.Description,
		string(rule.Severity),
		rule.Enabled,
		rule.CooldownMinutes,
		now,
		rule.ID)

	return err
}

// UpdateRuleLastTriggered updates the last_triggered_at timestamp
func (r *repository) UpdateRuleLastTriggered(ctx context.Context, ruleID string, triggeredAt time.Time) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	stmt := fmt.Sprintf("UPDATE %s SET last_triggered_at = $1 WHERE id = $2", ruleTableName)
	_, err = persist.ExecContext(ctx, stmt, triggeredAt, ruleID)
	return err
}

// DeleteRule deletes an alert rule
func (r *repository) DeleteRule(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	return r.ruleDeleter.DeleteOne(ctx, resource.AlertRule, tnt, repo.Conditions{repo.NewEqualCondition("id", id)})
}

// CreateConditions creates conditions for a rule
func (r *repository) CreateConditions(ctx context.Context, ruleID string, conditions []model.AlertConditionInput, uuidGen func() string) error {
	if len(conditions) == 0 {
		return nil
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	values := make([]string, 0, len(conditions))
	args := make([]interface{}, 0, len(conditions)*len(conditionColumns))

	for i, cond := range conditions {
		placeholders := make([]string, len(conditionColumns))
		for j := range conditionColumns {
			placeholders[j] = fmt.Sprintf("$%d", i*len(conditionColumns)+j+1)
		}
		values = append(values, fmt.Sprintf("(%s)", strings.Join(placeholders, ", ")))

		args = append(args,
			uuidGen(),
			ruleID,
			cond.GroupID,
			cond.MetricName,
			string(cond.Operator),
			cond.Threshold,
			now,
		)
	}

	stmt := fmt.Sprintf("INSERT INTO %s (%s) VALUES %s",
		conditionTableName,
		strings.Join(conditionColumns, ", "),
		strings.Join(values, ", "))

	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

// DeleteConditionsForRule deletes all conditions for a rule
func (r *repository) DeleteConditionsForRule(ctx context.Context, ruleID string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	stmt := fmt.Sprintf("DELETE FROM %s WHERE alert_rule_id = $1", conditionTableName)
	_, err = persist.ExecContext(ctx, stmt, ruleID)
	return err
}

// CreateNotifications creates notifications for a rule
func (r *repository) CreateNotifications(ctx context.Context, ruleID string, notifications []model.AlertNotificationInput, uuidGen func() string) error {
	if len(notifications) == 0 {
		return nil
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	values := make([]string, 0, len(notifications))
	args := make([]interface{}, 0, len(notifications)*len(notificationColumns))

	for i, notif := range notifications {
		placeholders := make([]string, len(notificationColumns))
		for j := range notificationColumns {
			placeholders[j] = fmt.Sprintf("$%d", i*len(notificationColumns)+j+1)
		}
		values = append(values, fmt.Sprintf("(%s)", strings.Join(placeholders, ", ")))

		args = append(args,
			uuidGen(),
			ruleID,
			notif.Type,
			notif.Config,
			now,
		)
	}

	stmt := fmt.Sprintf("INSERT INTO %s (%s) VALUES %s",
		notificationTableName,
		strings.Join(notificationColumns, ", "),
		strings.Join(values, ", "))

	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

// DeleteNotificationsForRule deletes all notifications for a rule
func (r *repository) DeleteNotificationsForRule(ctx context.Context, ruleID string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	stmt := fmt.Sprintf("DELETE FROM %s WHERE alert_rule_id = $1", notificationTableName)
	_, err = persist.ExecContext(ctx, stmt, ruleID)
	return err
}

// CreateEvent creates an alert event
func (r *repository) CreateEvent(ctx context.Context, event model.AlertEvent) error {
	entity := r.conv.EventToEntity(event)

	now := time.Now()
	entity.CreatedAt = &now

	logger.C(ctx).Debugf("Persisting AlertEvent entity with id %s to db", event.ID)
	return r.eventCreator.Create(ctx, entity)
}

// GetEventsByRuleID retrieves events for a rule
func (r *repository) GetEventsByRuleID(ctx context.Context, ruleID string, first *int, after *string) ([]*model.AlertEvent, int, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total
	countStmt := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE alert_rule_id = $1", eventTableName)
	var totalCount int
	if err := persist.GetContext(ctx, &totalCount, countStmt, ruleID); err != nil {
		return nil, 0, err
	}

	// Build query
	limit := 20
	if first != nil && *first > 0 {
		limit = *first
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE alert_rule_id = $1 ORDER BY triggered_at DESC LIMIT $2",
		strings.Join(eventColumns, ", "),
		eventTableName)

	var entities EventEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, ruleID, limit); err != nil {
		return nil, 0, err
	}

	return r.conv.MultipleEventsFromEntity(entities), totalCount, nil
}

// GetEventsByDeviceID retrieves events for a device
func (r *repository) GetEventsByDeviceID(ctx context.Context, deviceID string, first *int, after *string) ([]*model.AlertEvent, int, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total
	countStmt := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE device_id = $1", eventTableName)
	var totalCount int
	if err := persist.GetContext(ctx, &totalCount, countStmt, deviceID); err != nil {
		return nil, 0, err
	}

	// Build query
	limit := 20
	if first != nil && *first > 0 {
		limit = *first
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE device_id = $1 ORDER BY triggered_at DESC LIMIT $2",
		strings.Join(eventColumns, ", "),
		eventTableName)

	var entities EventEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, deviceID, limit); err != nil {
		return nil, 0, err
	}

	return r.conv.MultipleEventsFromEntity(entities), totalCount, nil
}

// GetEventsByTenant retrieves events for a tenant
func (r *repository) GetEventsByTenant(ctx context.Context, first *int, after *string) ([]*model.AlertEvent, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, 0, err
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total
	countStmt := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE tenant_id = $1", eventTableName)
	var totalCount int
	if err := persist.GetContext(ctx, &totalCount, countStmt, tnt); err != nil {
		return nil, 0, err
	}

	// Build query
	limit := 20
	if first != nil && *first > 0 {
		limit = *first
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE tenant_id = $1 ORDER BY triggered_at DESC LIMIT $2",
		strings.Join(eventColumns, ", "),
		eventTableName)

	var entities EventEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, tnt, limit); err != nil {
		return nil, 0, err
	}

	return r.conv.MultipleEventsFromEntity(entities), totalCount, nil
}

// GetEventByID retrieves an event by ID
func (r *repository) GetEventByID(ctx context.Context, id string) (*model.AlertEvent, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE id = $1",
		strings.Join(eventColumns, ", "),
		eventTableName)

	var entity EventEntity
	if err := persist.GetContext(ctx, &entity, stmt, id); err != nil {
		return nil, err
	}

	return r.conv.EventFromEntity(&entity), nil
}

// UpdateEventStatus updates the status of an event
func (r *repository) UpdateEventStatus(ctx context.Context, id string, status model.AlertEventStatus, resolvedAt *time.Time) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	var stmt string
	var args []interface{}

	if resolvedAt != nil {
		stmt = fmt.Sprintf("UPDATE %s SET status = $1, resolved_at = $2 WHERE id = $3", eventTableName)
		args = []interface{}{string(status), *resolvedAt, id}
	} else {
		stmt = fmt.Sprintf("UPDATE %s SET status = $1 WHERE id = $2", eventTableName)
		args = []interface{}{string(status), id}
	}

	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

// Helper functions

func (r *repository) getConditionsForRule(ctx context.Context, ruleID string) ([]model.AlertConditionGroup, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE alert_rule_id = $1 ORDER BY group_id, id",
		strings.Join(conditionColumns, ", "),
		conditionTableName)

	var entities ConditionEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, ruleID); err != nil {
		return nil, err
	}

	return r.conv.GroupConditionsFromEntities(entities), nil
}

func (r *repository) getNotificationsForRule(ctx context.Context, ruleID string) ([]model.AlertNotification, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE alert_rule_id = $1",
		strings.Join(notificationColumns, ", "),
		notificationTableName)

	var entities NotificationEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, ruleID); err != nil {
		return nil, err
	}

	return r.conv.MultipleNotificationsFromEntity(entities), nil
}
