DROP INDEX IF EXISTS idx_alert_events_tenant;
DROP INDEX IF EXISTS idx_alert_events_device;
DROP INDEX IF EXISTS idx_alert_events_rule;
DROP INDEX IF EXISTS idx_alert_notifications_rule;
DROP INDEX IF EXISTS idx_alert_conditions_rule;
DROP INDEX IF EXISTS idx_alert_rules_enabled;
DROP INDEX IF EXISTS idx_alert_rules_tenant;
DROP INDEX IF EXISTS idx_alert_rules_device;

DROP TABLE IF EXISTS alert_events;
DROP TABLE IF EXISTS alert_notifications;
DROP TABLE IF EXISTS alert_conditions;
DROP TABLE IF EXISTS alert_rules;
