package rule

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/notification"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/pkg/errors"
)

// RuleRepository defines the data access the service needs.
type RuleRepository interface {
	CreateRule(ctx context.Context, rule model.AutomationRule) error
	GetRuleByID(ctx context.Context, id string) (*model.AutomationRule, error)
	GetEnabledRulesForDevice(ctx context.Context, deviceID string) ([]*model.AutomationRule, error)
	GetRulesByTenant(ctx context.Context, first *int, after *string) ([]*model.AutomationRule, int, error)
	UpdateRule(ctx context.Context, rule model.AutomationRule) error
	UpdateRuleLastTriggered(ctx context.Context, ruleID string, triggeredAt time.Time) error
	DeleteRule(ctx context.Context, id string) error
	CreateConditions(ctx context.Context, ruleID string, conditions []model.RuleConditionInput, uuidGen func() string) error
	DeleteConditionsForRule(ctx context.Context, ruleID string) error
	CreateActions(ctx context.Context, ruleID string, actions []model.RuleActionInput, uuidGen func() string) error
	DeleteActionsForRule(ctx context.Context, ruleID string) error
}

// MetricRepository provides latest metrics for multi-condition evaluation.
type MetricRepository interface {
	GetByDeviceID(ctx context.Context, deviceID string, filter model.MetricFilter) ([]*model.DeviceMetric, error)
}

// DeviceOperator sends operations to a device. Implemented by the device service.
type DeviceOperator interface {
	SendOperation(ctx context.Context, deviceID string, op model.OperationType) error
}

// IntegrationInvoker invokes a configured external integration. Implemented by
// the integration service. Optional — when nil, INTEGRATION actions are skipped.
type IntegrationInvoker interface {
	Invoke(ctx context.Context, id string, payload map[string]interface{}) (bool, error)
}

// UUIDService generates UUIDs.
type UUIDService interface {
	Generate() string
}

type service struct {
	ruleRepo        RuleRepository
	metricRepo      MetricRepository
	deviceOperator  DeviceOperator
	integration     IntegrationInvoker
	notificationSvc notification.Service
	transact        persistence.Transactioner
	uuidService     UUIDService
}

// NewService creates a new rule service.
func NewService(
	ruleRepo RuleRepository,
	metricRepo MetricRepository,
	deviceOperator DeviceOperator,
	integrationInvoker IntegrationInvoker,
	notificationSvc notification.Service,
	transact persistence.Transactioner,
	uuidService UUIDService,
) *service {
	return &service{
		ruleRepo:        ruleRepo,
		metricRepo:      metricRepo,
		deviceOperator:  deviceOperator,
		integration:     integrationInvoker,
		notificationSvc: notificationSvc,
		transact:        transact,
		uuidService:     uuidService,
	}
}

// ==================== CRUD ====================

func (s *service) CreateRule(ctx context.Context, input model.CreateAutomationRuleInput) (*model.AutomationRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	cooldown := 60
	if input.CooldownSeconds != nil {
		cooldown = *input.CooldownSeconds
	}

	rule := model.AutomationRule{
		ID:              s.uuidService.Generate(),
		TenantID:        tnt,
		DeviceID:        input.DeviceID,
		Name:            input.Name,
		Description:     input.Description,
		Enabled:         true,
		CooldownSeconds: cooldown,
	}

	if err := s.ruleRepo.CreateRule(ctx, rule); err != nil {
		return nil, errors.Wrap(err, "while creating rule")
	}
	if err := s.ruleRepo.CreateConditions(ctx, rule.ID, input.Conditions, s.uuidService.Generate); err != nil {
		return nil, errors.Wrap(err, "while creating rule conditions")
	}
	if err := s.ruleRepo.CreateActions(ctx, rule.ID, input.Actions, s.uuidService.Generate); err != nil {
		return nil, errors.Wrap(err, "while creating rule actions")
	}

	return s.ruleRepo.GetRuleByID(ctx, rule.ID)
}

func (s *service) GetRuleByID(ctx context.Context, id string) (*model.AutomationRule, error) {
	return s.ruleRepo.GetRuleByID(ctx, id)
}

func (s *service) GetAllRules(ctx context.Context, first *int, after *string) (*model.AutomationRulePage, error) {
	rules, totalCount, err := s.ruleRepo.GetRulesByTenant(ctx, first, after)
	if err != nil {
		return nil, err
	}
	return &model.AutomationRulePage{
		Data:       rules,
		TotalCount: totalCount,
		PageInfo:   &model.PageInfo{HasNextPage: false},
	}, nil
}

func (s *service) UpdateRule(ctx context.Context, id string, input model.UpdateAutomationRuleInput) (*model.AutomationRule, error) {
	rule, err := s.ruleRepo.GetRuleByID(ctx, id)
	if err != nil {
		return nil, errors.Wrap(err, "while getting rule")
	}

	if input.Name != nil {
		rule.Name = *input.Name
	}
	if input.Description != nil {
		rule.Description = input.Description
	}
	if input.Enabled != nil {
		rule.Enabled = *input.Enabled
	}
	if input.CooldownSeconds != nil {
		rule.CooldownSeconds = *input.CooldownSeconds
	}

	if err := s.ruleRepo.UpdateRule(ctx, *rule); err != nil {
		return nil, errors.Wrap(err, "while updating rule")
	}

	if input.Conditions != nil {
		if err := s.ruleRepo.DeleteConditionsForRule(ctx, id); err != nil {
			return nil, errors.Wrap(err, "while deleting old conditions")
		}
		if err := s.ruleRepo.CreateConditions(ctx, id, input.Conditions, s.uuidService.Generate); err != nil {
			return nil, errors.Wrap(err, "while creating new conditions")
		}
	}
	if input.Actions != nil {
		if err := s.ruleRepo.DeleteActionsForRule(ctx, id); err != nil {
			return nil, errors.Wrap(err, "while deleting old actions")
		}
		if err := s.ruleRepo.CreateActions(ctx, id, input.Actions, s.uuidService.Generate); err != nil {
			return nil, errors.Wrap(err, "while creating new actions")
		}
	}

	return s.ruleRepo.GetRuleByID(ctx, id)
}

func (s *service) SetEnabled(ctx context.Context, id string, enabled bool) (*model.AutomationRule, error) {
	return s.UpdateRule(ctx, id, model.UpdateAutomationRuleInput{Enabled: &enabled})
}

func (s *service) DeleteRule(ctx context.Context, id string) error {
	return s.ruleRepo.DeleteRule(ctx, id)
}

// ==================== Evaluation ====================

// EvaluateMetric is the RuleEvaluator hook, called on every recorded metric.
// It evaluates enabled rules for the device and, for those that fire, kicks off
// their action sequence asynchronously (so DELAY actions don't block ingestion).
func (s *service) EvaluateMetric(ctx context.Context, metric model.DeviceMetric) error {
	rules, err := s.ruleRepo.GetEnabledRulesForDevice(ctx, metric.DeviceID)
	if err != nil {
		return errors.Wrap(err, "while getting enabled rules")
	}
	if len(rules) == 0 {
		return nil
	}

	latestMetrics, err := s.getLatestMetricsMap(ctx, metric.DeviceID)
	if err != nil {
		return errors.Wrap(err, "while getting latest metrics")
	}
	latestMetrics[metric.MetricName] = metric.MetricValue

	now := time.Now()
	tnt := metric.TenantID

	for _, rule := range rules {
		if rule.LastTriggeredAt != nil {
			cooldownEnd := rule.LastTriggeredAt.Add(time.Duration(rule.CooldownSeconds) * time.Second)
			if now.Before(cooldownEnd) {
				continue
			}
		}

		if !s.evaluateRule(rule, latestMetrics) {
			continue
		}

		logger.C(ctx).Infof("Automation rule %s (%s) fired for device %s", rule.ID, rule.Name, metric.DeviceID)

		if err := s.ruleRepo.UpdateRuleLastTriggered(ctx, rule.ID, now); err != nil {
			logger.C(ctx).Errorf("Failed to update rule last triggered: %v", err)
		}

		// Run the action sequence asynchronously with a fresh context/tx so the
		// metric-record request isn't blocked by DELAY actions.
		go s.runActions(tnt, rule)
	}

	return nil
}

func (s *service) getLatestMetricsMap(ctx context.Context, deviceID string) (map[string]float64, error) {
	filter := model.MetricFilter{Limit: 100}
	metrics, err := s.metricRepo.GetByDeviceID(ctx, deviceID, filter)
	if err != nil {
		return nil, err
	}
	latestMap := make(map[string]float64)
	for _, m := range metrics {
		if _, exists := latestMap[m.MetricName]; !exists {
			latestMap[m.MetricName] = m.MetricValue
		}
	}
	return latestMap, nil
}

func (s *service) evaluateRule(rule *model.AutomationRule, metrics map[string]float64) bool {
	if len(rule.Conditions) == 0 {
		return false
	}
	// Groups ORed; conditions within a group ANDed.
	for _, group := range rule.Conditions {
		groupPassed := true
		for _, cond := range group.Conditions {
			value, exists := metrics[cond.MetricName]
			if !exists || !evaluateCondition(cond, value) {
				groupPassed = false
				break
			}
		}
		if groupPassed {
			return true
		}
	}
	return false
}

func evaluateCondition(cond model.RuleCondition, value float64) bool {
	switch cond.Operator {
	case model.RuleOperatorGT:
		return value > cond.Threshold
	case model.RuleOperatorLT:
		return value < cond.Threshold
	case model.RuleOperatorEQ:
		return value == cond.Threshold
	case model.RuleOperatorGTE:
		return value >= cond.Threshold
	case model.RuleOperatorLTE:
		return value <= cond.Threshold
	case model.RuleOperatorNE:
		return value != cond.Threshold
	default:
		return false
	}
}

// runActions executes a rule's actions in seq_order, honoring DELAY steps. It
// runs in its own goroutine with a background context and a dedicated DB
// transaction, because the originating request's transaction is already closed.
func (s *service) runActions(tenantID string, rule *model.AutomationRule) {
	ctx := tenant.SaveToContext(context.Background(), tenantID)

	tx, err := s.transact.Begin()
	if err != nil {
		logger.C(ctx).Errorf("rule %s: failed to begin tx for actions: %v", rule.ID, err)
		return
	}
	defer s.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	actions := append([]model.RuleAction(nil), rule.Actions...)
	sort.Slice(actions, func(i, j int) bool { return actions[i].SeqOrder < actions[j].SeqOrder })

	for _, action := range actions {
		switch action.Type {
		case model.RuleActionDelay:
			delay := action.DelaySeconds
			if delay > 0 {
				time.Sleep(time.Duration(delay) * time.Second)
			}
		case model.RuleActionDeviceOperation:
			if err := s.runDeviceOperation(ctx, rule, action); err != nil {
				logger.C(ctx).Errorf("rule %s: device operation action failed: %v", rule.ID, err)
			}
		case model.RuleActionNotification:
			if err := s.runNotification(ctx, action); err != nil {
				logger.C(ctx).Errorf("rule %s: notification action failed: %v", rule.ID, err)
			}
		case model.RuleActionIntegration:
			if err := s.runIntegration(ctx, rule, action); err != nil {
				logger.C(ctx).Errorf("rule %s: integration action failed: %v", rule.ID, err)
			}
		default:
			logger.C(ctx).Warnf("rule %s: unknown action type %s", rule.ID, action.Type)
		}
	}

	if err := tx.Commit(); err != nil {
		logger.C(ctx).Errorf("rule %s: failed to commit action tx: %v", rule.ID, err)
	}
}

func (s *service) runDeviceOperation(ctx context.Context, rule *model.AutomationRule, action model.RuleAction) error {
	targetID := rule.DeviceID
	if action.TargetDeviceID != nil && *action.TargetDeviceID != "" {
		targetID = *action.TargetDeviceID
	}
	if action.Operation == nil || *action.Operation == "" {
		return errors.New("device operation action has no operation")
	}
	return s.deviceOperator.SendOperation(ctx, targetID, model.OperationType(*action.Operation))
}

func (s *service) runIntegration(ctx context.Context, rule *model.AutomationRule, action model.RuleAction) error {
	if s.integration == nil {
		return errors.New("integration invoker is not configured")
	}
	if action.IntegrationID == nil || *action.IntegrationID == "" {
		return errors.New("integration action has no integration id")
	}
	payload := map[string]interface{}{
		"source":      "automation-rule",
		"ruleId":      rule.ID,
		"ruleName":    rule.Name,
		"deviceId":    rule.DeviceID,
		"triggeredAt": time.Now().Format(time.RFC3339),
	}
	_, err := s.integration.Invoke(ctx, *action.IntegrationID, payload)
	return err
}

func (s *service) runNotification(ctx context.Context, action model.RuleAction) error {
	if action.NotificationType == nil || action.NotificationConfig == nil {
		return errors.New("notification action missing type or config")
	}

	switch *action.NotificationType {
	case "email":
		var cfg model.EmailNotificationConfig
		if err := json.Unmarshal([]byte(*action.NotificationConfig), &cfg); err != nil {
			return errors.Wrap(err, "while parsing email config")
		}
		subject := cfg.Subject
		if subject == "" {
			subject = "IoT automation rule triggered"
		}
		return s.notificationSvc.SendEmail(ctx, cfg.Recipients, subject, "An automation rule was triggered.")
	case "webhook":
		var cfg model.WebhookNotificationConfig
		if err := json.Unmarshal([]byte(*action.NotificationConfig), &cfg); err != nil {
			return errors.Wrap(err, "while parsing webhook config")
		}
		payload := map[string]interface{}{
			"triggeredAt": time.Now().Format(time.RFC3339),
			"source":      "automation-rule",
		}
		return s.notificationSvc.SendWebhook(ctx, cfg.URL, cfg.Method, cfg.Headers, payload)
	default:
		return errors.Errorf("unknown notification type: %s", *action.NotificationType)
	}
}
