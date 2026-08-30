package rule

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct{}

// NewConverter creates a new rule converter.
func NewConverter() *converter {
	return &converter{}
}

// RuleToEntity converts a model.AutomationRule to a RuleEntity.
func (c *converter) RuleToEntity(m model.AutomationRule) *RuleEntity {
	entity := &RuleEntity{
		ID:              m.ID,
		TenantID:        m.TenantID,
		DeviceID:        m.DeviceID,
		Name:            m.Name,
		Description:     repo.NewNullableString(m.Description),
		Enabled:         m.Enabled,
		CooldownSeconds: m.CooldownSeconds,
		CreatedAt:       m.CreatedAt,
	}

	if m.LastTriggeredAt != nil {
		entity.LastTriggeredAt.Time = *m.LastTriggeredAt
		entity.LastTriggeredAt.Valid = true
	}
	if m.UpdatedAt != nil {
		entity.UpdatedAt.Time = *m.UpdatedAt
		entity.UpdatedAt.Valid = true
	}

	return entity
}

// RuleFromEntity converts a RuleEntity to a model.AutomationRule.
func (c *converter) RuleFromEntity(entity *RuleEntity) *model.AutomationRule {
	if entity == nil {
		return nil
	}

	rule := &model.AutomationRule{
		ID:              entity.ID,
		TenantID:        entity.TenantID,
		DeviceID:        entity.DeviceID,
		Name:            entity.Name,
		Description:     repo.StringPtrFromNullableString(entity.Description),
		Enabled:         entity.Enabled,
		CooldownSeconds: entity.CooldownSeconds,
		CreatedAt:       entity.CreatedAt,
	}

	if entity.LastTriggeredAt.Valid {
		rule.LastTriggeredAt = &entity.LastTriggeredAt.Time
	}
	if entity.UpdatedAt.Valid {
		rule.UpdatedAt = &entity.UpdatedAt.Time
	}

	return rule
}

// MultipleRulesFromEntity converts a collection of rule entities to models.
func (c *converter) MultipleRulesFromEntity(entities RuleEntityCollection) []*model.AutomationRule {
	rules := make([]*model.AutomationRule, 0, len(entities))
	for i := range entities {
		rules = append(rules, c.RuleFromEntity(&entities[i]))
	}
	return rules
}

// ConditionFromEntity converts a ConditionEntity to a model.RuleCondition.
func (c *converter) ConditionFromEntity(entity *ConditionEntity) *model.RuleCondition {
	if entity == nil {
		return nil
	}
	return &model.RuleCondition{
		ID:         entity.ID,
		MetricName: entity.MetricName,
		Operator:   model.RuleConditionOperator(entity.Operator),
		Threshold:  entity.Threshold,
	}
}

// GroupConditionsFromEntities groups conditions by group_id.
func (c *converter) GroupConditionsFromEntities(entities ConditionEntityCollection) []model.RuleConditionGroup {
	groupMap := make(map[int][]model.RuleCondition)
	order := make([]int, 0)

	for i := range entities {
		cond := c.ConditionFromEntity(&entities[i])
		if _, seen := groupMap[entities[i].GroupID]; !seen {
			order = append(order, entities[i].GroupID)
		}
		groupMap[entities[i].GroupID] = append(groupMap[entities[i].GroupID], *cond)
	}

	groups := make([]model.RuleConditionGroup, 0, len(groupMap))
	for _, groupID := range order {
		groups = append(groups, model.RuleConditionGroup{
			GroupID:    groupID,
			Conditions: groupMap[groupID],
		})
	}
	return groups
}

// ActionFromEntity converts an ActionEntity to a model.RuleAction.
func (c *converter) ActionFromEntity(entity *ActionEntity) *model.RuleAction {
	if entity == nil {
		return nil
	}
	return &model.RuleAction{
		ID:                 entity.ID,
		SeqOrder:           entity.SeqOrder,
		Type:               model.RuleActionType(entity.ActionType),
		TargetDeviceID:     repo.StringPtrFromNullableString(entity.TargetDeviceID),
		Operation:          repo.StringPtrFromNullableString(entity.Operation),
		NotificationType:   repo.StringPtrFromNullableString(entity.NotificationType),
		NotificationConfig: repo.StringPtrFromNullableString(entity.NotificationConfig),
		IntegrationID:      repo.StringPtrFromNullableString(entity.IntegrationID),
		DelaySeconds:       entity.DelaySeconds,
	}
}

// MultipleActionsFromEntity converts a collection of action entities to models
// (ordered as returned by the query, i.e. by seq_order).
func (c *converter) MultipleActionsFromEntity(entities ActionEntityCollection) []model.RuleAction {
	actions := make([]model.RuleAction, 0, len(entities))
	for i := range entities {
		actions = append(actions, *c.ActionFromEntity(&entities[i]))
	}
	return actions
}

// ==================== GraphQL conversions ====================

// RuleToGraphQL converts a model.AutomationRule to graphql.AutomationRule.
// The device field is resolved separately (see gqlgen.yml AutomationRule.device).
func (c *converter) RuleToGraphQL(m *model.AutomationRule) *graphql.AutomationRule {
	if m == nil {
		return nil
	}

	var lastTriggeredAt, createdAt, updatedAt *graphql.Timestamp
	if m.LastTriggeredAt != nil {
		ts := graphql.Timestamp(*m.LastTriggeredAt)
		lastTriggeredAt = &ts
	}
	if m.CreatedAt != nil {
		ts := graphql.Timestamp(*m.CreatedAt)
		createdAt = &ts
	}
	if m.UpdatedAt != nil {
		ts := graphql.Timestamp(*m.UpdatedAt)
		updatedAt = &ts
	}

	groups := make([]*graphql.RuleConditionGroup, 0, len(m.Conditions))
	for _, g := range m.Conditions {
		conditions := make([]*graphql.RuleCondition, 0, len(g.Conditions))
		for _, cond := range g.Conditions {
			conditions = append(conditions, &graphql.RuleCondition{
				ID:         cond.ID,
				MetricName: cond.MetricName,
				Operator:   graphql.RuleConditionOperator(cond.Operator),
				Threshold:  cond.Threshold,
			})
		}
		groups = append(groups, &graphql.RuleConditionGroup{
			GroupID:    g.GroupID,
			Conditions: conditions,
		})
	}

	actions := make([]*graphql.RuleAction, 0, len(m.Actions))
	for _, a := range m.Actions {
		var op *graphql.OperationType
		if a.Operation != nil {
			o := graphql.OperationType(*a.Operation)
			op = &o
		}
		actions = append(actions, &graphql.RuleAction{
			ID:                 a.ID,
			SeqOrder:           a.SeqOrder,
			Type:               graphql.RuleActionType(a.Type),
			TargetDeviceID:     a.TargetDeviceID,
			Operation:          op,
			NotificationType:   a.NotificationType,
			NotificationConfig: a.NotificationConfig,
			IntegrationID:      a.IntegrationID,
			DelaySeconds:       a.DelaySeconds,
		})
	}

	return &graphql.AutomationRule{
		ID:              m.ID,
		Name:            m.Name,
		Description:     m.Description,
		Enabled:         m.Enabled,
		CooldownSeconds: m.CooldownSeconds,
		Conditions:      groups,
		Actions:         actions,
		LastTriggeredAt: lastTriggeredAt,
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
	}
}

// RulePageToGraphQL converts a model.AutomationRulePage to graphql.
func (c *converter) RulePageToGraphQL(p *model.AutomationRulePage) *graphql.AutomationRulePage {
	if p == nil {
		return nil
	}
	data := make([]*graphql.AutomationRule, 0, len(p.Data))
	for _, r := range p.Data {
		data = append(data, c.RuleToGraphQL(r))
	}
	return &graphql.AutomationRulePage{
		Data:       data,
		TotalCount: p.TotalCount,
		PageInfo:   &graphql.PageInfo{},
	}
}

// CreateInputFromGraphQL converts graphql.CreateAutomationRuleInput to model.
func (c *converter) CreateInputFromGraphQL(in graphql.CreateAutomationRuleInput) model.CreateAutomationRuleInput {
	return model.CreateAutomationRuleInput{
		DeviceID:        in.DeviceID,
		Name:            in.Name,
		Description:     in.Description,
		CooldownSeconds: in.CooldownSeconds,
		Conditions:      conditionInputsFromGraphQL(in.Conditions),
		Actions:         actionInputsFromGraphQL(in.Actions),
	}
}

// UpdateInputFromGraphQL converts graphql.UpdateAutomationRuleInput to model.
func (c *converter) UpdateInputFromGraphQL(in graphql.UpdateAutomationRuleInput) model.UpdateAutomationRuleInput {
	out := model.UpdateAutomationRuleInput{
		Name:            in.Name,
		Description:     in.Description,
		Enabled:         in.Enabled,
		CooldownSeconds: in.CooldownSeconds,
	}
	if in.Conditions != nil {
		out.Conditions = conditionInputsFromGraphQL(in.Conditions)
	}
	if in.Actions != nil {
		out.Actions = actionInputsFromGraphQL(in.Actions)
	}
	return out
}

func conditionInputsFromGraphQL(in []*graphql.RuleConditionInput) []model.RuleConditionInput {
	out := make([]model.RuleConditionInput, 0, len(in))
	for _, c := range in {
		if c == nil {
			continue
		}
		out = append(out, model.RuleConditionInput{
			GroupID:    c.GroupID,
			MetricName: c.MetricName,
			Operator:   model.RuleConditionOperator(c.Operator),
			Threshold:  c.Threshold,
		})
	}
	return out
}

func actionInputsFromGraphQL(in []*graphql.RuleActionInput) []model.RuleActionInput {
	out := make([]model.RuleActionInput, 0, len(in))
	for _, a := range in {
		if a == nil {
			continue
		}
		var op *string
		if a.Operation != nil {
			s := string(*a.Operation)
			op = &s
		}
		out = append(out, model.RuleActionInput{
			SeqOrder:           a.SeqOrder,
			Type:               model.RuleActionType(a.Type),
			TargetDeviceID:     a.TargetDeviceID,
			Operation:          op,
			NotificationType:   a.NotificationType,
			NotificationConfig: a.NotificationConfig,
			IntegrationID:      a.IntegrationID,
			DelaySeconds:       a.DelaySeconds,
		})
	}
	return out
}
