package alert

import (
	"encoding/json"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct{}

// NewConverter creates a new alert converter
func NewConverter() *converter {
	return &converter{}
}

// RuleToEntity converts a model.AlertRule to a RuleEntity
func (c *converter) RuleToEntity(m model.AlertRule) *RuleEntity {
	entity := &RuleEntity{
		ID:              m.ID,
		TenantID:        m.TenantID,
		DeviceID:        m.DeviceID,
		Name:            m.Name,
		Description:     repo.NewNullableString(m.Description),
		Severity:        string(m.Severity),
		Enabled:         m.Enabled,
		CooldownMinutes: m.CooldownMinutes,
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

// RuleFromEntity converts a RuleEntity to a model.AlertRule
func (c *converter) RuleFromEntity(entity *RuleEntity) *model.AlertRule {
	if entity == nil {
		return nil
	}

	rule := &model.AlertRule{
		ID:              entity.ID,
		TenantID:        entity.TenantID,
		DeviceID:        entity.DeviceID,
		Name:            entity.Name,
		Description:     repo.StringPtrFromNullableString(entity.Description),
		Severity:        model.AlertSeverity(entity.Severity),
		Enabled:         entity.Enabled,
		CooldownMinutes: entity.CooldownMinutes,
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

// MultipleRulesFromEntity converts a collection of rule entities to models
func (c *converter) MultipleRulesFromEntity(entities RuleEntityCollection) []*model.AlertRule {
	rules := make([]*model.AlertRule, 0, len(entities))
	for _, entity := range entities {
		rules = append(rules, c.RuleFromEntity(&entity))
	}
	return rules
}

// ConditionToEntity converts a model.AlertCondition to a ConditionEntity
func (c *converter) ConditionToEntity(m model.AlertCondition, ruleID string, groupID int) *ConditionEntity {
	return &ConditionEntity{
		ID:          m.ID,
		AlertRuleID: ruleID,
		GroupID:     groupID,
		MetricName:  m.MetricName,
		Operator:    string(m.Operator),
		Threshold:   m.Threshold,
	}
}

// ConditionFromEntity converts a ConditionEntity to a model.AlertCondition
func (c *converter) ConditionFromEntity(entity *ConditionEntity) *model.AlertCondition {
	if entity == nil {
		return nil
	}

	return &model.AlertCondition{
		ID:         entity.ID,
		MetricName: entity.MetricName,
		Operator:   model.AlertConditionOperator(entity.Operator),
		Threshold:  entity.Threshold,
	}
}

// GroupConditionsFromEntities groups conditions by group_id
func (c *converter) GroupConditionsFromEntities(entities ConditionEntityCollection) []model.AlertConditionGroup {
	groupMap := make(map[int][]model.AlertCondition)

	for _, entity := range entities {
		cond := c.ConditionFromEntity(&entity)
		groupMap[entity.GroupID] = append(groupMap[entity.GroupID], *cond)
	}

	groups := make([]model.AlertConditionGroup, 0, len(groupMap))
	for groupID, conditions := range groupMap {
		groups = append(groups, model.AlertConditionGroup{
			GroupID:    groupID,
			Conditions: conditions,
		})
	}

	return groups
}

// NotificationToEntity converts a model.AlertNotification to a NotificationEntity
func (c *converter) NotificationToEntity(m model.AlertNotification, ruleID string) *NotificationEntity {
	return &NotificationEntity{
		ID:          m.ID,
		AlertRuleID: ruleID,
		Type:        m.Type,
		Config:      m.Config,
	}
}

// NotificationFromEntity converts a NotificationEntity to a model.AlertNotification
func (c *converter) NotificationFromEntity(entity *NotificationEntity) *model.AlertNotification {
	if entity == nil {
		return nil
	}

	return &model.AlertNotification{
		ID:     entity.ID,
		Type:   entity.Type,
		Config: entity.Config,
	}
}

// MultipleNotificationsFromEntity converts a collection of notification entities to models
func (c *converter) MultipleNotificationsFromEntity(entities NotificationEntityCollection) []model.AlertNotification {
	notifications := make([]model.AlertNotification, 0, len(entities))
	for _, entity := range entities {
		notifications = append(notifications, *c.NotificationFromEntity(&entity))
	}
	return notifications
}

// EventToEntity converts a model.AlertEvent to an EventEntity
func (c *converter) EventToEntity(m model.AlertEvent) *EventEntity {
	triggeredValues, _ := json.Marshal(m.TriggeredValues)

	entity := &EventEntity{
		ID:              m.ID,
		AlertRuleID:     m.AlertRuleID,
		DeviceID:        m.DeviceID,
		TenantID:        m.TenantID,
		TriggeredValues: string(triggeredValues),
		Status:          string(m.Status),
		TriggeredAt:     m.TriggeredAt,
		CreatedAt:       m.CreatedAt,
	}

	if m.ResolvedAt != nil {
		entity.ResolvedAt.Time = *m.ResolvedAt
		entity.ResolvedAt.Valid = true
	}

	return entity
}

// EventFromEntity converts an EventEntity to a model.AlertEvent
func (c *converter) EventFromEntity(entity *EventEntity) *model.AlertEvent {
	if entity == nil {
		return nil
	}

	var triggeredValues map[string]float64
	json.Unmarshal([]byte(entity.TriggeredValues), &triggeredValues)

	event := &model.AlertEvent{
		ID:              entity.ID,
		AlertRuleID:     entity.AlertRuleID,
		DeviceID:        entity.DeviceID,
		TenantID:        entity.TenantID,
		TriggeredValues: triggeredValues,
		Status:          model.AlertEventStatus(entity.Status),
		TriggeredAt:     entity.TriggeredAt,
		CreatedAt:       entity.CreatedAt,
	}

	if entity.ResolvedAt.Valid {
		event.ResolvedAt = &entity.ResolvedAt.Time
	}

	return event
}

// MultipleEventsFromEntity converts a collection of event entities to models
func (c *converter) MultipleEventsFromEntity(entities EventEntityCollection) []*model.AlertEvent {
	events := make([]*model.AlertEvent, 0, len(entities))
	for _, entity := range entities {
		events = append(events, c.EventFromEntity(&entity))
	}
	return events
}

// RuleToGraphQL converts a model.AlertRule to graphql.AlertRule
func (c *converter) RuleToGraphQL(m *model.AlertRule) *graphql.AlertRule {
	if m == nil {
		return nil
	}

	var lastTriggeredAt *graphql.Timestamp
	if m.LastTriggeredAt != nil {
		ts := graphql.Timestamp(*m.LastTriggeredAt)
		lastTriggeredAt = &ts
	}

	var createdAt *graphql.Timestamp
	if m.CreatedAt != nil {
		ts := graphql.Timestamp(*m.CreatedAt)
		createdAt = &ts
	}

	var updatedAt *graphql.Timestamp
	if m.UpdatedAt != nil {
		ts := graphql.Timestamp(*m.UpdatedAt)
		updatedAt = &ts
	}

	conditionGroups := make([]*graphql.AlertConditionGroup, 0, len(m.Conditions))
	for _, group := range m.Conditions {
		conditionGroups = append(conditionGroups, c.ConditionGroupToGraphQL(group))
	}

	notifications := make([]*graphql.AlertNotification, 0, len(m.Notifications))
	for _, n := range m.Notifications {
		notifications = append(notifications, c.NotificationToGraphQL(n))
	}

	return &graphql.AlertRule{
		ID:              m.ID,
		Name:            m.Name,
		Description:     m.Description,
		Severity:        graphql.AlertSeverity(m.Severity),
		Enabled:         m.Enabled,
		CooldownMinutes: m.CooldownMinutes,
		Conditions:      conditionGroups,
		Notifications:   notifications,
		LastTriggeredAt: lastTriggeredAt,
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
	}
}

// MultipleRulesToGraphQL converts a slice of model.AlertRule to graphql.AlertRule
func (c *converter) MultipleRulesToGraphQL(rules []*model.AlertRule) []*graphql.AlertRule {
	result := make([]*graphql.AlertRule, 0, len(rules))
	for _, r := range rules {
		if r != nil {
			result = append(result, c.RuleToGraphQL(r))
		}
	}
	return result
}

// ConditionGroupToGraphQL converts a model.AlertConditionGroup to graphql.AlertConditionGroup
func (c *converter) ConditionGroupToGraphQL(g model.AlertConditionGroup) *graphql.AlertConditionGroup {
	conditions := make([]*graphql.AlertCondition, 0, len(g.Conditions))
	for _, cond := range g.Conditions {
		conditions = append(conditions, c.ConditionToGraphQL(cond))
	}

	return &graphql.AlertConditionGroup{
		GroupID:    g.GroupID,
		Conditions: conditions,
	}
}

// ConditionToGraphQL converts a model.AlertCondition to graphql.AlertCondition
func (c *converter) ConditionToGraphQL(cond model.AlertCondition) *graphql.AlertCondition {
	return &graphql.AlertCondition{
		ID:         cond.ID,
		MetricName: cond.MetricName,
		Operator:   graphql.AlertConditionOperator(cond.Operator),
		Threshold:  cond.Threshold,
	}
}

// NotificationToGraphQL converts a model.AlertNotification to graphql.AlertNotification
func (c *converter) NotificationToGraphQL(n model.AlertNotification) *graphql.AlertNotification {
	return &graphql.AlertNotification{
		ID:     n.ID,
		Type:   n.Type,
		Config: n.Config,
	}
}

// EventToGraphQL converts a model.AlertEvent to graphql.AlertEvent
func (c *converter) EventToGraphQL(e *model.AlertEvent) *graphql.AlertEvent {
	if e == nil {
		return nil
	}

	triggeredValuesJSON, _ := json.Marshal(e.TriggeredValues)

	triggeredAt := graphql.Timestamp(e.TriggeredAt)

	var resolvedAt *graphql.Timestamp
	if e.ResolvedAt != nil {
		ts := graphql.Timestamp(*e.ResolvedAt)
		resolvedAt = &ts
	}

	return &graphql.AlertEvent{
		ID:              e.ID,
		TriggeredValues: string(triggeredValuesJSON),
		Status:          graphql.AlertEventStatus(e.Status),
		TriggeredAt:     triggeredAt,
		ResolvedAt:      resolvedAt,
	}
}

// MultipleEventsToGraphQL converts a slice of model.AlertEvent to graphql.AlertEvent
func (c *converter) MultipleEventsToGraphQL(events []*model.AlertEvent) []*graphql.AlertEvent {
	result := make([]*graphql.AlertEvent, 0, len(events))
	for _, e := range events {
		if e != nil {
			result = append(result, c.EventToGraphQL(e))
		}
	}
	return result
}

// CreateInputFromGraphQL converts graphql.CreateAlertRuleInput to model.CreateAlertRuleInput
func (c *converter) CreateInputFromGraphQL(in graphql.CreateAlertRuleInput) model.CreateAlertRuleInput {
	input := model.CreateAlertRuleInput{
		DeviceID:      in.DeviceID,
		Name:          in.Name,
		Description:   in.Description,
		Conditions:    c.ConditionInputsFromGraphQL(in.Conditions),
		Notifications: c.NotificationInputsFromGraphQL(in.Notifications),
	}

	if in.Severity != nil {
		severity := model.AlertSeverity(*in.Severity)
		input.Severity = &severity
	}

	if in.CooldownMinutes != nil {
		input.CooldownMinutes = in.CooldownMinutes
	}

	return input
}

// UpdateInputFromGraphQL converts graphql.UpdateAlertRuleInput to model.UpdateAlertRuleInput
func (c *converter) UpdateInputFromGraphQL(in graphql.UpdateAlertRuleInput) model.UpdateAlertRuleInput {
	input := model.UpdateAlertRuleInput{
		Name:            in.Name,
		Description:     in.Description,
		Enabled:         in.Enabled,
		CooldownMinutes: in.CooldownMinutes,
	}

	if in.Severity != nil {
		severity := model.AlertSeverity(*in.Severity)
		input.Severity = &severity
	}

	if in.Conditions != nil {
		input.Conditions = c.ConditionInputsFromGraphQL(in.Conditions)
	}

	if in.Notifications != nil {
		input.Notifications = c.NotificationInputsFromGraphQL(in.Notifications)
	}

	return input
}

// ConditionInputsFromGraphQL converts graphql condition inputs to model inputs
func (c *converter) ConditionInputsFromGraphQL(inputs []*graphql.AlertConditionInput) []model.AlertConditionInput {
	result := make([]model.AlertConditionInput, 0, len(inputs))
	for _, in := range inputs {
		result = append(result, model.AlertConditionInput{
			GroupID:    in.GroupID,
			MetricName: in.MetricName,
			Operator:   model.AlertConditionOperator(in.Operator),
			Threshold:  in.Threshold,
		})
	}
	return result
}

// NotificationInputsFromGraphQL converts graphql notification inputs to model inputs
func (c *converter) NotificationInputsFromGraphQL(inputs []*graphql.AlertNotificationInput) []model.AlertNotificationInput {
	result := make([]model.AlertNotificationInput, 0, len(inputs))
	for _, in := range inputs {
		result = append(result, model.AlertNotificationInput{
			Type:   in.Type,
			Config: in.Config,
		})
	}
	return result
}

// RulePageToGraphQL converts a model.AlertRulePage to graphql.AlertRulePage
func (c *converter) RulePageToGraphQL(page *model.AlertRulePage) *graphql.AlertRulePage {
	if page == nil {
		return nil
	}

	return &graphql.AlertRulePage{
		Data:       c.MultipleRulesToGraphQL(page.Data),
		PageInfo:   pageInfoToGraphQL(page.PageInfo),
		TotalCount: page.TotalCount,
	}
}

// EventPageToGraphQL converts a model.AlertEventPage to graphql.AlertEventPage
func (c *converter) EventPageToGraphQL(page *model.AlertEventPage) *graphql.AlertEventPage {
	if page == nil {
		return nil
	}

	return &graphql.AlertEventPage{
		Data:       c.MultipleEventsToGraphQL(page.Data),
		PageInfo:   pageInfoToGraphQL(page.PageInfo),
		TotalCount: page.TotalCount,
	}
}

func pageInfoToGraphQL(info *model.PageInfo) *graphql.PageInfo {
	if info == nil {
		return nil
	}

	return &graphql.PageInfo{
		StartCursor: info.StartCursor,
		EndCursor:   info.EndCursor,
		HasNextPage: info.HasNextPage,
	}
}

// TimePtrFromGraphQL converts a graphql.Timestamp pointer to a time.Time pointer
func (c *converter) TimePtrFromGraphQL(ts *graphql.Timestamp) *time.Time {
	if ts == nil {
		return nil
	}
	t := time.Time(*ts)
	return &t
}
