package rule

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// RuleSvc defines the rule service surface used by the resolver.
type RuleSvc interface {
	CreateRule(ctx context.Context, input model.CreateAutomationRuleInput) (*model.AutomationRule, error)
	GetRuleByID(ctx context.Context, id string) (*model.AutomationRule, error)
	GetAllRules(ctx context.Context, first *int, after *string) (*model.AutomationRulePage, error)
	UpdateRule(ctx context.Context, id string, input model.UpdateAutomationRuleInput) (*model.AutomationRule, error)
	SetEnabled(ctx context.Context, id string, enabled bool) (*model.AutomationRule, error)
	DeleteRule(ctx context.Context, id string) error
}

// RuleConv defines the conversions used by the resolver.
type RuleConv interface {
	RuleToGraphQL(*model.AutomationRule) *graphql.AutomationRule
	RulePageToGraphQL(*model.AutomationRulePage) *graphql.AutomationRulePage
	CreateInputFromGraphQL(graphql.CreateAutomationRuleInput) model.CreateAutomationRuleInput
	UpdateInputFromGraphQL(graphql.UpdateAutomationRuleInput) model.UpdateAutomationRuleInput
}

// DeviceSvc looks up a device for the AutomationRule.device field resolver.
type DeviceSvc interface {
	GetByID(ctx context.Context, id string) (*model.Device, error)
}

// DeviceConv converts a device model to graphql.
type DeviceConv interface {
	ToGraphQL(*model.Device) *graphql.Device
}

// Resolver handles GraphQL queries/mutations for automation rules.
type Resolver struct {
	transact   persistence.Transactioner
	ruleSvc    RuleSvc
	ruleConv   RuleConv
	deviceSvc  DeviceSvc
	deviceConv DeviceConv
}

// NewResolver creates a new rule resolver.
func NewResolver(transact persistence.Transactioner, ruleSvc RuleSvc, ruleConv RuleConv, deviceSvc DeviceSvc, deviceConv DeviceConv) *Resolver {
	return &Resolver{
		transact:   transact,
		ruleSvc:    ruleSvc,
		ruleConv:   ruleConv,
		deviceSvc:  deviceSvc,
		deviceConv: deviceConv,
	}
}

func (r *Resolver) AutomationRules(ctx context.Context, first *int, after *string) (*graphql.AutomationRulePage, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	page, err := r.ruleSvc.GetAllRules(ctx, first, after)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.ruleConv.RulePageToGraphQL(page), nil
}

func (r *Resolver) AutomationRule(ctx context.Context, id string) (*graphql.AutomationRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	rule, err := r.ruleSvc.GetRuleByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.ruleConv.RuleToGraphQL(rule), nil
}

func (r *Resolver) CreateAutomationRule(ctx context.Context, input graphql.CreateAutomationRuleInput) (*graphql.AutomationRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	rule, err := r.ruleSvc.CreateRule(ctx, r.ruleConv.CreateInputFromGraphQL(input))
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.ruleConv.RuleToGraphQL(rule), nil
}

func (r *Resolver) UpdateAutomationRule(ctx context.Context, id string, input graphql.UpdateAutomationRuleInput) (*graphql.AutomationRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	rule, err := r.ruleSvc.UpdateRule(ctx, id, r.ruleConv.UpdateInputFromGraphQL(input))
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.ruleConv.RuleToGraphQL(rule), nil
}

func (r *Resolver) SetAutomationRuleEnabled(ctx context.Context, id string, enabled bool) (*graphql.AutomationRule, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	rule, err := r.ruleSvc.SetEnabled(ctx, id, enabled)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.ruleConv.RuleToGraphQL(rule), nil
}

func (r *Resolver) DeleteAutomationRule(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.ruleSvc.DeleteRule(ctx, id); err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return id, nil
}

// RuleDevice resolves the device field for AutomationRule.
func (r *Resolver) RuleDevice(ctx context.Context, obj *graphql.AutomationRule) (*graphql.Device, error) {
	if obj == nil {
		return nil, nil
	}

	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)
	ctx = persistence.SaveToContext(ctx, tx)

	rule, err := r.ruleSvc.GetRuleByID(ctx, obj.ID)
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
