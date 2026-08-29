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
	ruleColumns          = []string{"id", "tenant_id", "device_id", "name", "description", "severity", "enabled", "cooldown_minutes", "last_triggered_at", "created_at", "updated_at"}
	ruleUpdatableColumns = []string{"name", "description", "severity", "enabled", "cooldown_minutes", "updated_at"}
	conditionColumns     = []string{"id", "alert_rule_id", "group_id", "metric_name", "operator", "threshold", "created_at"}
	notificationColumns  = []string{"id", "alert_rule_id", "type", "config", "created_at"}
	eventColumns         = []string{"id", "alert_rule_id", "device_id", "tenant_id", "triggered_values", "status", "triggered_at", "resolved_at", "created_at"}
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
	// Rule operations using repo helpers
	ruleCreator repo.Creator
	ruleLister  repo.Lister
	ruleGetter  repo.SingleGetter
	ruleDeleter repo.Deleter
	ruleUpdater repo.Updater

	// Condition operations using repo helpers
	conditionDeleter repo.Deleter
	conditionLister  repo.ListerGlobal

	// Notification operations using repo helpers
	notificationDeleter repo.Deleter
	notificationLister  repo.ListerGlobal

	// Event operations using repo helpers
	eventCreator repo.CreatorGlobal
	eventGetter  repo.SingleGetterGlobal
	eventLister  repo.ListerGlobal

	conv RuleEntityConverter
}

// NewRepository creates a new alert repository
func NewRepository(converter RuleEntityConverter) *repository {
	return &repository{
		// Rules
		ruleCreator: repo.NewCreator(ruleTableName, ruleColumns),
		ruleLister:  repo.NewListerWithEmbeddedTenant(ruleTableName, tenantColumn, ruleColumns),
		ruleGetter:  repo.NewSingleGetterWithEmbeddedTenant(ruleTableName, tenantColumn, ruleColumns),
		ruleDeleter: repo.NewDeleter(ruleTableName),
		ruleUpdater: repo.NewUpdater(ruleTableName, ruleUpdatableColumns, []string{"id"}),

		// Conditions
		conditionDeleter: repo.NewDeleter(conditionTableName),
		conditionLister:  repo.NewListerGlobal(resource.AlertRule, conditionTableName, conditionColumns),

		// Notifications
		notificationDeleter: repo.NewDeleter(notificationTableName),
		notificationLister:  repo.NewListerGlobal(resource.AlertRule, notificationTableName, notificationColumns),

		// Events
		eventCreator: repo.NewCreatorGlobal(resource.AlertEvent, eventTableName, eventColumns),
		eventGetter:  repo.NewSingleGetterGlobal(resource.AlertEvent, eventTableName, eventColumns),
		eventLister:  repo.NewListerGlobal(resource.AlertEvent, eventTableName, eventColumns),

		conv: converter,
	}
}

// ==================== Rule Operations ====================

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

	return r.loadRuleRelations(ctx, &entity)
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

	return r.loadMultipleRuleRelations(ctx, entities)
}

// GetEnabledRulesForDevice retrieves enabled alert rules for a device (used by evaluator)
func (r *repository) GetEnabledRulesForDevice(ctx context.Context, deviceID string) ([]*model.AlertRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	var entities RuleEntityCollection
	conditions := repo.Conditions{
		repo.NewEqualCondition("device_id", deviceID),
		repo.NewEqualCondition("enabled", true),
	}
	if err := r.ruleLister.List(ctx, resource.AlertRule, tnt, &entities, conditions...); err != nil {
		return nil, err
	}

	return r.loadMultipleRuleRelations(ctx, entities)
}

// GetRulesByTenant retrieves all alert rules for a tenant with pagination
func (r *repository) GetRulesByTenant(ctx context.Context, first *int, after *string) ([]*model.AlertRule, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total using repo helper
	totalCount, err := r.ruleLister.Count(ctx, resource.AlertRule, tnt)
	if err != nil {
		return nil, 0, err
	}

	// List with limit (pagination handled via raw SQL for cursor support)
	limit := 20
	if first != nil && *first > 0 {
		limit = *first
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2",
		strings.Join(ruleColumns, ", "),
		ruleTableName)

	var entities RuleEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, tnt, limit); err != nil {
		return nil, 0, err
	}

	rules, err := r.loadMultipleRuleRelations(ctx, entities)
	if err != nil {
		return nil, 0, err
	}

	return rules, totalCount, nil
}

// UpdateRule updates an alert rule
func (r *repository) UpdateRule(ctx context.Context, rule model.AlertRule) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	entity := &RuleEntity{
		ID:              rule.ID,
		Name:            rule.Name,
		Description:     repo.NewNullableString(rule.Description),
		Severity:        string(rule.Severity),
		Enabled:         rule.Enabled,
		CooldownMinutes: rule.CooldownMinutes,
		UpdatedAt:       repo.NewNullableTime(&now),
	}

	return r.ruleUpdater.UpdateSingle(ctx, resource.AlertRule, tnt, entity)
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

// ==================== Condition Operations ====================

// CreateConditions creates conditions for a rule (batch insert)
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

	logger.C(ctx).Debugf("Batch inserting %d conditions for rule %s", len(conditions), ruleID)
	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

// DeleteConditionsForRule deletes all conditions for a rule
func (r *repository) DeleteConditionsForRule(ctx context.Context, ruleID string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	return r.conditionDeleter.DeleteMany(ctx, resource.AlertRule, tnt, repo.Conditions{repo.NewEqualCondition("alert_rule_id", ruleID)})
}

// ==================== Notification Operations ====================

// CreateNotifications creates notifications for a rule (batch insert)
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

	logger.C(ctx).Debugf("Batch inserting %d notifications for rule %s", len(notifications), ruleID)
	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

// DeleteNotificationsForRule deletes all notifications for a rule
func (r *repository) DeleteNotificationsForRule(ctx context.Context, ruleID string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	return r.notificationDeleter.DeleteMany(ctx, resource.AlertRule, tnt, repo.Conditions{repo.NewEqualCondition("alert_rule_id", ruleID)})
}

// ==================== Event Operations ====================

// CreateEvent creates an alert event
func (r *repository) CreateEvent(ctx context.Context, event model.AlertEvent) error {
	entity := r.conv.EventToEntity(event)
	now := time.Now()
	entity.CreatedAt = &now

	logger.C(ctx).Debugf("Persisting AlertEvent entity with id %s to db", event.ID)
	return r.eventCreator.Create(ctx, entity)
}

// GetEventByID retrieves an event by ID
func (r *repository) GetEventByID(ctx context.Context, id string) (*model.AlertEvent, error) {
	var entity EventEntity
	if err := r.eventGetter.GetGlobal(ctx, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	return r.conv.EventFromEntity(&entity), nil
}

// GetEventsByRuleID retrieves events for a rule with pagination
func (r *repository) GetEventsByRuleID(ctx context.Context, ruleID string, first *int, after *string) ([]*model.AlertEvent, int, error) {
	return r.getEventsPaginated(ctx, "alert_rule_id", ruleID, first)
}

// GetEventsByDeviceID retrieves events for a device with pagination
func (r *repository) GetEventsByDeviceID(ctx context.Context, deviceID string, first *int, after *string) ([]*model.AlertEvent, int, error) {
	return r.getEventsPaginated(ctx, "device_id", deviceID, first)
}

// GetEventsByTenant retrieves events for a tenant with pagination
func (r *repository) GetEventsByTenant(ctx context.Context, first *int, after *string) ([]*model.AlertEvent, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, 0, err
	}

	return r.getEventsPaginated(ctx, tenantColumn, tnt, first)
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

// ==================== Helper Functions ====================

// loadRuleRelations loads conditions and notifications for a single rule
func (r *repository) loadRuleRelations(ctx context.Context, entity *RuleEntity) (*model.AlertRule, error) {
	rule := r.conv.RuleFromEntity(entity)

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

	return rule, nil
}

// loadMultipleRuleRelations loads conditions and notifications for multiple rules
func (r *repository) loadMultipleRuleRelations(ctx context.Context, entities RuleEntityCollection) ([]*model.AlertRule, error) {
	rules := r.conv.MultipleRulesFromEntity(entities)

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

// getConditionsForRule retrieves conditions using repo helper
func (r *repository) getConditionsForRule(ctx context.Context, ruleID string) ([]model.AlertConditionGroup, error) {
	var entities ConditionEntityCollection
	if err := r.conditionLister.ListGlobal(ctx, &entities, repo.NewEqualCondition("alert_rule_id", ruleID)); err != nil {
		return nil, err
	}

	return r.conv.GroupConditionsFromEntities(entities), nil
}

// getNotificationsForRule retrieves notifications using repo helper
func (r *repository) getNotificationsForRule(ctx context.Context, ruleID string) ([]model.AlertNotification, error) {
	var entities NotificationEntityCollection
	if err := r.notificationLister.ListGlobal(ctx, &entities, repo.NewEqualCondition("alert_rule_id", ruleID)); err != nil {
		return nil, err
	}

	return r.conv.MultipleNotificationsFromEntity(entities), nil
}

// getEventsPaginated is a helper for paginated event queries
func (r *repository) getEventsPaginated(ctx context.Context, filterColumn, filterValue string, first *int) ([]*model.AlertEvent, int, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Count total
	countStmt := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s = $1", eventTableName, filterColumn)
	var totalCount int
	if err := persist.GetContext(ctx, &totalCount, countStmt, filterValue); err != nil {
		return nil, 0, err
	}

	// Build query with limit
	limit := 20
	if first != nil && *first > 0 {
		limit = *first
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE %s = $1 ORDER BY triggered_at DESC LIMIT $2",
		strings.Join(eventColumns, ", "),
		eventTableName,
		filterColumn)

	var entities EventEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, filterValue, limit); err != nil {
		return nil, 0, err
	}

	return r.conv.MultipleEventsFromEntity(entities), totalCount, nil
}
