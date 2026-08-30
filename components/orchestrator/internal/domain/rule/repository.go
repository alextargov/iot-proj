package rule

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
	ruleTableName      = "public.automation_rules"
	conditionTableName = "public.rule_conditions"
	actionTableName    = "public.rule_actions"
	tenantColumn       = "tenant_id"
)

var (
	ruleColumns          = []string{"id", "tenant_id", "device_id", "name", "description", "enabled", "cooldown_seconds", "last_triggered_at", "created_at", "updated_at"}
	ruleUpdatableColumns = []string{"name", "description", "enabled", "cooldown_seconds", "updated_at"}
	conditionColumns     = []string{"id", "rule_id", "group_id", "metric_name", "operator", "threshold", "created_at"}
	actionColumns        = []string{"id", "rule_id", "seq_order", "action_type", "target_device_id", "operation", "notification_type", "notification_config", "integration_id", "delay_seconds", "created_at"}
)

// RuleEntityConverter defines the conversions the repository needs.
type RuleEntityConverter interface {
	RuleToEntity(m model.AutomationRule) *RuleEntity
	RuleFromEntity(entity *RuleEntity) *model.AutomationRule
	MultipleRulesFromEntity(entities RuleEntityCollection) []*model.AutomationRule
	GroupConditionsFromEntities(entities ConditionEntityCollection) []model.RuleConditionGroup
	MultipleActionsFromEntity(entities ActionEntityCollection) []model.RuleAction
}

type repository struct {
	ruleCreator repo.Creator
	ruleLister  repo.Lister
	ruleGetter  repo.SingleGetter
	ruleDeleter repo.Deleter
	ruleUpdater repo.Updater

	conditionDeleter repo.Deleter
	conditionLister  repo.ListerGlobal

	actionDeleter repo.Deleter
	actionLister  repo.ListerGlobal

	conv RuleEntityConverter
}

// NewRepository creates a new rule repository.
func NewRepository(converter RuleEntityConverter) *repository {
	return &repository{
		ruleCreator: repo.NewCreator(ruleTableName, ruleColumns),
		ruleLister:  repo.NewListerWithEmbeddedTenant(ruleTableName, tenantColumn, ruleColumns),
		ruleGetter:  repo.NewSingleGetterWithEmbeddedTenant(ruleTableName, tenantColumn, ruleColumns),
		ruleDeleter: repo.NewDeleter(ruleTableName),
		ruleUpdater: repo.NewUpdater(ruleTableName, ruleUpdatableColumns, []string{"id"}),

		conditionDeleter: repo.NewDeleter(conditionTableName),
		conditionLister:  repo.NewListerGlobal(resource.AutomationRule, conditionTableName, conditionColumns),

		actionDeleter: repo.NewDeleter(actionTableName),
		actionLister:  repo.NewListerGlobal(resource.AutomationRule, actionTableName, actionColumns),

		conv: converter,
	}
}

// ==================== Rule Operations ====================

func (r *repository) CreateRule(ctx context.Context, rule model.AutomationRule) error {
	entity := r.conv.RuleToEntity(rule)
	now := time.Now()
	entity.CreatedAt = &now

	logger.C(ctx).Debugf("Persisting AutomationRule entity with id %s to db", rule.ID)
	return r.ruleCreator.Create(ctx, resource.AutomationRule, entity)
}

func (r *repository) GetRuleByID(ctx context.Context, id string) (*model.AutomationRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	var entity RuleEntity
	if err := r.ruleGetter.Get(ctx, resource.AutomationRule, tnt, repo.Conditions{repo.NewEqualCondition("id", id)}, repo.NoOrderBy, &entity); err != nil {
		return nil, err
	}

	return r.loadRuleRelations(ctx, &entity)
}

func (r *repository) GetEnabledRulesForDevice(ctx context.Context, deviceID string) ([]*model.AutomationRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, err
	}

	var entities RuleEntityCollection
	conditions := repo.Conditions{
		repo.NewEqualCondition("device_id", deviceID),
		repo.NewEqualCondition("enabled", true),
	}
	if err := r.ruleLister.List(ctx, resource.AutomationRule, tnt, &entities, conditions...); err != nil {
		return nil, err
	}

	return r.loadMultipleRuleRelations(ctx, entities)
}

func (r *repository) GetRulesByTenant(ctx context.Context, first *int, after *string) ([]*model.AutomationRule, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, 0, err
	}

	totalCount, err := r.ruleLister.Count(ctx, resource.AutomationRule, tnt)
	if err != nil {
		return nil, 0, err
	}

	limit := 50
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

func (r *repository) UpdateRule(ctx context.Context, rule model.AutomationRule) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	entity := &RuleEntity{
		ID:              rule.ID,
		Name:            rule.Name,
		Description:     repo.NewNullableString(rule.Description),
		Enabled:         rule.Enabled,
		CooldownSeconds: rule.CooldownSeconds,
		UpdatedAt:       repo.NewNullableTime(&now),
	}

	return r.ruleUpdater.UpdateSingle(ctx, resource.AutomationRule, tnt, entity)
}

func (r *repository) UpdateRuleLastTriggered(ctx context.Context, ruleID string, triggeredAt time.Time) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	stmt := fmt.Sprintf("UPDATE %s SET last_triggered_at = $1 WHERE id = $2", ruleTableName)
	_, err = persist.ExecContext(ctx, stmt, triggeredAt, ruleID)
	return err
}

func (r *repository) DeleteRule(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	return r.ruleDeleter.DeleteOne(ctx, resource.AutomationRule, tnt, repo.Conditions{repo.NewEqualCondition("id", id)})
}

// ==================== Condition Operations ====================

func (r *repository) CreateConditions(ctx context.Context, ruleID string, conditions []model.RuleConditionInput, uuidGen func() string) error {
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

func (r *repository) DeleteConditionsForRule(ctx context.Context, ruleID string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	return r.conditionDeleter.DeleteMany(ctx, resource.AutomationRule, tnt, repo.Conditions{repo.NewEqualCondition("rule_id", ruleID)})
}

// ==================== Action Operations ====================

func (r *repository) CreateActions(ctx context.Context, ruleID string, actions []model.RuleActionInput, uuidGen func() string) error {
	if len(actions) == 0 {
		return nil
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	values := make([]string, 0, len(actions))
	args := make([]interface{}, 0, len(actions)*len(actionColumns))

	for i, act := range actions {
		placeholders := make([]string, len(actionColumns))
		for j := range actionColumns {
			placeholders[j] = fmt.Sprintf("$%d", i*len(actionColumns)+j+1)
		}
		values = append(values, fmt.Sprintf("(%s)", strings.Join(placeholders, ", ")))

		delay := 0
		if act.DelaySeconds != nil {
			delay = *act.DelaySeconds
		}

		args = append(args,
			uuidGen(),
			ruleID,
			act.SeqOrder,
			string(act.Type),
			repo.NewNullableString(act.TargetDeviceID),
			repo.NewNullableString(act.Operation),
			repo.NewNullableString(act.NotificationType),
			repo.NewNullableString(act.NotificationConfig),
			repo.NewNullableString(act.IntegrationID),
			delay,
			now,
		)
	}

	stmt := fmt.Sprintf("INSERT INTO %s (%s) VALUES %s",
		actionTableName,
		strings.Join(actionColumns, ", "),
		strings.Join(values, ", "))

	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

func (r *repository) DeleteActionsForRule(ctx context.Context, ruleID string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return err
	}

	return r.actionDeleter.DeleteMany(ctx, resource.AutomationRule, tnt, repo.Conditions{repo.NewEqualCondition("rule_id", ruleID)})
}

// ==================== Helpers ====================

func (r *repository) loadRuleRelations(ctx context.Context, entity *RuleEntity) (*model.AutomationRule, error) {
	rule := r.conv.RuleFromEntity(entity)

	conditions, err := r.getConditionsForRule(ctx, rule.ID)
	if err != nil {
		return nil, err
	}
	rule.Conditions = conditions

	actions, err := r.getActionsForRule(ctx, rule.ID)
	if err != nil {
		return nil, err
	}
	rule.Actions = actions

	return rule, nil
}

func (r *repository) loadMultipleRuleRelations(ctx context.Context, entities RuleEntityCollection) ([]*model.AutomationRule, error) {
	rules := r.conv.MultipleRulesFromEntity(entities)

	for _, rule := range rules {
		conditions, err := r.getConditionsForRule(ctx, rule.ID)
		if err != nil {
			return nil, err
		}
		rule.Conditions = conditions

		actions, err := r.getActionsForRule(ctx, rule.ID)
		if err != nil {
			return nil, err
		}
		rule.Actions = actions
	}

	return rules, nil
}

func (r *repository) getConditionsForRule(ctx context.Context, ruleID string) ([]model.RuleConditionGroup, error) {
	var entities ConditionEntityCollection
	if err := r.conditionLister.ListGlobal(ctx, &entities, repo.NewEqualCondition("rule_id", ruleID)); err != nil {
		return nil, err
	}

	return r.conv.GroupConditionsFromEntities(entities), nil
}

func (r *repository) getActionsForRule(ctx context.Context, ruleID string) ([]model.RuleAction, error) {
	var entities ActionEntityCollection
	if err := r.actionLister.ListGlobal(ctx, &entities, repo.NewEqualCondition("rule_id", ruleID)); err != nil {
		return nil, err
	}

	return r.conv.MultipleActionsFromEntity(entities), nil
}
