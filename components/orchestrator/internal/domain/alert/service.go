package alert

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/notification"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

// AlertRepository defines the interface for alert data access
type AlertRepository interface {
	CreateRule(ctx context.Context, rule model.AlertRule) error
	GetRuleByID(ctx context.Context, id string) (*model.AlertRule, error)
	GetRulesByDeviceID(ctx context.Context, deviceID string) ([]*model.AlertRule, error)
	GetEnabledRulesForDevice(ctx context.Context, deviceID string) ([]*model.AlertRule, error)
	GetRulesByTenant(ctx context.Context, first *int, after *string) ([]*model.AlertRule, int, error)
	UpdateRule(ctx context.Context, rule model.AlertRule) error
	UpdateRuleLastTriggered(ctx context.Context, ruleID string, triggeredAt time.Time) error
	DeleteRule(ctx context.Context, id string) error
	CreateConditions(ctx context.Context, ruleID string, conditions []model.AlertConditionInput, uuidGen func() string) error
	DeleteConditionsForRule(ctx context.Context, ruleID string) error
	CreateNotifications(ctx context.Context, ruleID string, notifications []model.AlertNotificationInput, uuidGen func() string) error
	DeleteNotificationsForRule(ctx context.Context, ruleID string) error
	CreateEvent(ctx context.Context, event model.AlertEvent) error
	GetEventsByRuleID(ctx context.Context, ruleID string, first *int, after *string) ([]*model.AlertEvent, int, error)
	GetEventsByDeviceID(ctx context.Context, deviceID string, first *int, after *string) ([]*model.AlertEvent, int, error)
	GetEventsByTenant(ctx context.Context, first *int, after *string) ([]*model.AlertEvent, int, error)
	GetEventByID(ctx context.Context, id string) (*model.AlertEvent, error)
	UpdateEventStatus(ctx context.Context, id string, status model.AlertEventStatus, resolvedAt *time.Time) error
}

// MetricRepository defines the interface for getting latest metrics
type MetricRepository interface {
	GetByDeviceID(ctx context.Context, deviceID string, filter model.MetricFilter) ([]*model.DeviceMetric, error)
}

// DeviceGetter defines the interface for getting device info
type DeviceGetter interface {
	GetByID(ctx context.Context, id string) (*model.Device, error)
}

// UUIDService defines the interface for UUID generation
type UUIDService interface {
	Generate() string
}

type service struct {
	alertRepo       AlertRepository
	metricRepo      MetricRepository
	deviceGetter    DeviceGetter
	notificationSvc notification.Service
	uuidService     UUIDService
}

// NewService creates a new alert service
func NewService(
	alertRepo AlertRepository,
	metricRepo MetricRepository,
	deviceGetter DeviceGetter,
	notificationSvc notification.Service,
	uuidService UUIDService,
) *service {
	return &service{
		alertRepo:       alertRepo,
		metricRepo:      metricRepo,
		deviceGetter:    deviceGetter,
		notificationSvc: notificationSvc,
		uuidService:     uuidService,
	}
}

// CreateRule creates a new alert rule
func (s *service) CreateRule(ctx context.Context, input model.CreateAlertRuleInput) (*model.AlertRule, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	severity := model.AlertSeverityWarning
	if input.Severity != nil {
		severity = *input.Severity
	}

	cooldownMinutes := 15
	if input.CooldownMinutes != nil {
		cooldownMinutes = *input.CooldownMinutes
	}

	rule := model.AlertRule{
		ID:              s.uuidService.Generate(),
		TenantID:        tnt,
		DeviceID:        input.DeviceID,
		Name:            input.Name,
		Description:     input.Description,
		Severity:        severity,
		Enabled:         true,
		CooldownMinutes: cooldownMinutes,
	}

	logger.C(ctx).Debugf("Creating alert rule %s for device %s", rule.Name, rule.DeviceID)

	if err := s.alertRepo.CreateRule(ctx, rule); err != nil {
		return nil, errors.Wrap(err, "while creating alert rule")
	}

	// Create conditions
	if err := s.alertRepo.CreateConditions(ctx, rule.ID, input.Conditions, s.uuidService.Generate); err != nil {
		return nil, errors.Wrap(err, "while creating alert conditions")
	}

	// Create notifications
	if err := s.alertRepo.CreateNotifications(ctx, rule.ID, input.Notifications, s.uuidService.Generate); err != nil {
		return nil, errors.Wrap(err, "while creating alert notifications")
	}

	return s.alertRepo.GetRuleByID(ctx, rule.ID)
}

// GetRuleByID retrieves an alert rule by ID
func (s *service) GetRuleByID(ctx context.Context, id string) (*model.AlertRule, error) {
	return s.alertRepo.GetRuleByID(ctx, id)
}

// GetRulesByDeviceID retrieves all alert rules for a device
func (s *service) GetRulesByDeviceID(ctx context.Context, deviceID string, first *int, after *string) (*model.AlertRulePage, error) {
	rules, err := s.alertRepo.GetRulesByDeviceID(ctx, deviceID)
	if err != nil {
		return nil, err
	}

	return &model.AlertRulePage{
		Data:       rules,
		TotalCount: len(rules),
		PageInfo:   &model.PageInfo{HasNextPage: false},
	}, nil
}

// GetAllRules retrieves all alert rules for the tenant
func (s *service) GetAllRules(ctx context.Context, first *int, after *string) (*model.AlertRulePage, error) {
	rules, totalCount, err := s.alertRepo.GetRulesByTenant(ctx, first, after)
	if err != nil {
		return nil, err
	}

	return &model.AlertRulePage{
		Data:       rules,
		TotalCount: totalCount,
		PageInfo:   &model.PageInfo{HasNextPage: false},
	}, nil
}

// UpdateRule updates an alert rule
func (s *service) UpdateRule(ctx context.Context, id string, input model.UpdateAlertRuleInput) (*model.AlertRule, error) {
	rule, err := s.alertRepo.GetRuleByID(ctx, id)
	if err != nil {
		return nil, errors.Wrap(err, "while getting rule")
	}

	if input.Name != nil {
		rule.Name = *input.Name
	}
	if input.Description != nil {
		rule.Description = input.Description
	}
	if input.Severity != nil {
		rule.Severity = *input.Severity
	}
	if input.Enabled != nil {
		rule.Enabled = *input.Enabled
	}
	if input.CooldownMinutes != nil {
		rule.CooldownMinutes = *input.CooldownMinutes
	}

	logger.C(ctx).Debugf("Updating alert rule %s", id)

	if err := s.alertRepo.UpdateRule(ctx, *rule); err != nil {
		return nil, errors.Wrap(err, "while updating alert rule")
	}

	// Update conditions if provided
	if input.Conditions != nil {
		if err := s.alertRepo.DeleteConditionsForRule(ctx, id); err != nil {
			return nil, errors.Wrap(err, "while deleting old conditions")
		}
		if err := s.alertRepo.CreateConditions(ctx, id, input.Conditions, s.uuidService.Generate); err != nil {
			return nil, errors.Wrap(err, "while creating new conditions")
		}
	}

	// Update notifications if provided
	if input.Notifications != nil {
		if err := s.alertRepo.DeleteNotificationsForRule(ctx, id); err != nil {
			return nil, errors.Wrap(err, "while deleting old notifications")
		}
		if err := s.alertRepo.CreateNotifications(ctx, id, input.Notifications, s.uuidService.Generate); err != nil {
			return nil, errors.Wrap(err, "while creating new notifications")
		}
	}

	return s.alertRepo.GetRuleByID(ctx, id)
}

// DeleteRule deletes an alert rule
func (s *service) DeleteRule(ctx context.Context, id string) error {
	logger.C(ctx).Debugf("Deleting alert rule %s", id)
	return s.alertRepo.DeleteRule(ctx, id)
}

// GetEvents retrieves alert events with optional filters
func (s *service) GetEvents(ctx context.Context, deviceID *string, ruleID *string, first *int, after *string) (*model.AlertEventPage, error) {
	var events []*model.AlertEvent
	var totalCount int
	var err error

	if ruleID != nil {
		events, totalCount, err = s.alertRepo.GetEventsByRuleID(ctx, *ruleID, first, after)
	} else if deviceID != nil {
		events, totalCount, err = s.alertRepo.GetEventsByDeviceID(ctx, *deviceID, first, after)
	} else {
		events, totalCount, err = s.alertRepo.GetEventsByTenant(ctx, first, after)
	}

	if err != nil {
		return nil, err
	}

	return &model.AlertEventPage{
		Data:       events,
		TotalCount: totalCount,
		PageInfo:   &model.PageInfo{HasNextPage: false},
	}, nil
}

// AcknowledgeEvent acknowledges an alert event
func (s *service) AcknowledgeEvent(ctx context.Context, id string) (*model.AlertEvent, error) {
	logger.C(ctx).Debugf("Acknowledging alert event %s", id)

	if err := s.alertRepo.UpdateEventStatus(ctx, id, model.AlertEventStatusAcknowledged, nil); err != nil {
		return nil, errors.Wrap(err, "while acknowledging event")
	}

	return s.alertRepo.GetEventByID(ctx, id)
}

// EvaluateMetric evaluates alert rules when a new metric is recorded
// This is called from the metric service after recording a metric
func (s *service) EvaluateMetric(ctx context.Context, metric model.DeviceMetric) error {
	// Get all enabled rules for this device
	rules, err := s.alertRepo.GetEnabledRulesForDevice(ctx, metric.DeviceID)
	if err != nil {
		return errors.Wrap(err, "while getting enabled rules")
	}

	if len(rules) == 0 {
		return nil
	}

	// Get latest metrics for this device (for multi-condition evaluation)
	latestMetrics, err := s.getLatestMetricsMap(ctx, metric.DeviceID)
	if err != nil {
		return errors.Wrap(err, "while getting latest metrics")
	}

	// Update with the current metric
	latestMetrics[metric.MetricName] = metric.MetricValue

	// Get device info for notifications
	device, err := s.deviceGetter.GetByID(ctx, metric.DeviceID)
	if err != nil {
		logger.C(ctx).Warnf("Failed to get device %s: %v", metric.DeviceID, err)
		device = &model.Device{ID: metric.DeviceID, Name: "Unknown"}
	}

	now := time.Now()

	for _, rule := range rules {
		// Check cooldown
		if rule.LastTriggeredAt != nil {
			cooldownEnd := rule.LastTriggeredAt.Add(time.Duration(rule.CooldownMinutes) * time.Minute)
			if now.Before(cooldownEnd) {
				logger.C(ctx).Debugf("Rule %s is in cooldown until %v", rule.ID, cooldownEnd)
				continue
			}
		}

		// Evaluate the rule
		triggered, triggeredValues := s.evaluateRule(rule, latestMetrics)
		if !triggered {
			continue
		}

		logger.C(ctx).Infof("Alert rule %s (%s) triggered for device %s", rule.ID, rule.Name, metric.DeviceID)

		// Create event
		event := model.AlertEvent{
			ID:              s.uuidService.Generate(),
			AlertRuleID:     rule.ID,
			DeviceID:        metric.DeviceID,
			TenantID:        metric.TenantID,
			TriggeredValues: triggeredValues,
			Status:          model.AlertEventStatusTriggered,
			TriggeredAt:     now,
		}

		if err := s.alertRepo.CreateEvent(ctx, event); err != nil {
			logger.C(ctx).Errorf("Failed to create alert event: %v", err)
			continue
		}

		// Update last triggered
		if err := s.alertRepo.UpdateRuleLastTriggered(ctx, rule.ID, now); err != nil {
			logger.C(ctx).Errorf("Failed to update last triggered: %v", err)
		}

		// Send notifications
		for _, notif := range rule.Notifications {
			if err := s.notificationSvc.Send(ctx, notif, rule, device, triggeredValues); err != nil {
				logger.C(ctx).Errorf("Failed to send notification: %v", err)
			}
		}
	}

	return nil
}

func (s *service) getLatestMetricsMap(ctx context.Context, deviceID string) (map[string]float64, error) {
	filter := model.MetricFilter{Limit: 100}
	metrics, err := s.metricRepo.GetByDeviceID(ctx, deviceID, filter)
	if err != nil {
		return nil, err
	}

	// Build map of latest value per metric name
	latestMap := make(map[string]float64)
	for _, m := range metrics {
		if _, exists := latestMap[m.MetricName]; !exists {
			latestMap[m.MetricName] = m.MetricValue
		}
	}

	return latestMap, nil
}

// evaluateRule checks if a rule's conditions are met
// Returns (triggered, triggeredValues)
func (s *service) evaluateRule(rule *model.AlertRule, metrics map[string]float64) (bool, map[string]float64) {
	if len(rule.Conditions) == 0 {
		return false, nil
	}

	triggeredValues := make(map[string]float64)

	// Groups are ORed together - if any group evaluates to true, the rule triggers
	for _, group := range rule.Conditions {
		groupPassed := true

		// Conditions within a group are ANDed together
		for _, cond := range group.Conditions {
			value, exists := metrics[cond.MetricName]
			if !exists {
				groupPassed = false
				break
			}

			if !s.evaluateCondition(cond, value) {
				groupPassed = false
				break
			}

			triggeredValues[cond.MetricName] = value
		}

		if groupPassed {
			return true, triggeredValues
		}
	}

	return false, nil
}

func (s *service) evaluateCondition(cond model.AlertCondition, value float64) bool {
	switch cond.Operator {
	case model.AlertOperatorGT:
		return value > cond.Threshold
	case model.AlertOperatorLT:
		return value < cond.Threshold
	case model.AlertOperatorEQ:
		return value == cond.Threshold
	case model.AlertOperatorGTE:
		return value >= cond.Threshold
	case model.AlertOperatorLTE:
		return value <= cond.Threshold
	case model.AlertOperatorNE:
		return value != cond.Threshold
	default:
		return false
	}
}
