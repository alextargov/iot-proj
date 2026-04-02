package alert

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// AlertSvc defines the interface for the alert service
type AlertSvc interface {
	CreateRule(ctx context.Context, input model.CreateAlertRuleInput) (*model.AlertRule, error)
	GetRuleByID(ctx context.Context, id string) (*model.AlertRule, error)
	GetRulesByDeviceID(ctx context.Context, deviceID string, first *int, after *string) (*model.AlertRulePage, error)
	GetAllRules(ctx context.Context, first *int, after *string) (*model.AlertRulePage, error)
	UpdateRule(ctx context.Context, id string, input model.UpdateAlertRuleInput) (*model.AlertRule, error)
	DeleteRule(ctx context.Context, id string) error
	GetEvents(ctx context.Context, deviceID *string, ruleID *string, first *int, after *string) (*model.AlertEventPage, error)
	AcknowledgeEvent(ctx context.Context, id string) (*model.AlertEvent, error)
}

// AlertConv defines the interface for alert conversion
type AlertConv interface {
	RuleToGraphQL(*model.AlertRule) *graphql.AlertRule
	RulePageToGraphQL(*model.AlertRulePage) *graphql.AlertRulePage
	EventToGraphQL(*model.AlertEvent) *graphql.AlertEvent
	EventPageToGraphQL(*model.AlertEventPage) *graphql.AlertEventPage
	CreateInputFromGraphQL(graphql.CreateAlertRuleInput) model.CreateAlertRuleInput
	UpdateInputFromGraphQL(graphql.UpdateAlertRuleInput) model.UpdateAlertRuleInput
}

// DeviceSvc defines the interface for device lookup
type DeviceSvc interface {
	GetByID(ctx context.Context, id string) (*model.Device, error)
}

// DeviceConv defines the interface for device conversion
type DeviceConv interface {
	ToGraphQL(*model.Device) *graphql.Device
}

// Resolver handles GraphQL queries and mutations for alerts
type Resolver struct {
	transact   persistence.Transactioner
	alertSvc   AlertSvc
	alertConv  AlertConv
	deviceSvc  DeviceSvc
	deviceConv DeviceConv
}

// NewResolver creates a new alert resolver
func NewResolver(
	transact persistence.Transactioner,
	alertSvc AlertSvc,
	alertConv AlertConv,
	deviceSvc DeviceSvc,
	deviceConv DeviceConv,
) *Resolver {
	return &Resolver{
		transact:   transact,
		alertSvc:   alertSvc,
		alertConv:  alertConv,
		deviceSvc:  deviceSvc,
		deviceConv: deviceConv,
	}
}

// AlertRules retrieves alert rules with optional device filter
func (r *Resolver) AlertRules(ctx context.Context, deviceID *string, first *int, after *string) (*graphql.AlertRulePage, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	var page *model.AlertRulePage
	if deviceID != nil {
		page, err = r.alertSvc.GetRulesByDeviceID(ctx, *deviceID, first, after)
	} else {
		page, err = r.alertSvc.GetAllRules(ctx, first, after)
	}

	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.alertConv.RulePageToGraphQL(page), nil
}

// AlertRule retrieves a single alert rule by ID
func (r *Resolver) AlertRule(ctx context.Context, id string) (*graphql.AlertRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	rule, err := r.alertSvc.GetRuleByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.alertConv.RuleToGraphQL(rule), nil
}

// AlertEvents retrieves alert events with optional filters
func (r *Resolver) AlertEvents(ctx context.Context, deviceID *string, ruleID *string, first *int, after *string) (*graphql.AlertEventPage, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	page, err := r.alertSvc.GetEvents(ctx, deviceID, ruleID, first, after)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.alertConv.EventPageToGraphQL(page), nil
}

// CreateAlertRule creates a new alert rule
func (r *Resolver) CreateAlertRule(ctx context.Context, input graphql.CreateAlertRuleInput) (*graphql.AlertRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.alertConv.CreateInputFromGraphQL(input)
	rule, err := r.alertSvc.CreateRule(ctx, modelInput)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.alertConv.RuleToGraphQL(rule), nil
}

// UpdateAlertRule updates an existing alert rule
func (r *Resolver) UpdateAlertRule(ctx context.Context, id string, input graphql.UpdateAlertRuleInput) (*graphql.AlertRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.alertConv.UpdateInputFromGraphQL(input)
	rule, err := r.alertSvc.UpdateRule(ctx, id, modelInput)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.alertConv.RuleToGraphQL(rule), nil
}

// DeleteAlertRule deletes an alert rule
func (r *Resolver) DeleteAlertRule(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.alertSvc.DeleteRule(ctx, id); err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return id, nil
}

// AcknowledgeAlertEvent acknowledges an alert event
func (r *Resolver) AcknowledgeAlertEvent(ctx context.Context, id string) (*graphql.AlertEvent, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	event, err := r.alertSvc.AcknowledgeEvent(ctx, id)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.alertConv.EventToGraphQL(event), nil
}

// AlertRuleDevice resolves the device field for AlertRule
func (r *Resolver) AlertRuleDevice(ctx context.Context, obj *graphql.AlertRule) (*graphql.Device, error) {
	if obj == nil {
		return nil, nil
	}

	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	// Get the rule to find the device ID
	rule, err := r.alertSvc.GetRuleByID(ctx, obj.ID)
	if err != nil {
		return nil, err
	}

	device, err := r.deviceSvc.GetByID(ctx, rule.DeviceID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.deviceConv.ToGraphQL(device), nil
}
