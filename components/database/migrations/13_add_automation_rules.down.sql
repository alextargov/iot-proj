BEGIN;

DROP INDEX IF EXISTS idx_rule_actions_rule;
DROP INDEX IF EXISTS idx_rule_conditions_rule;
DROP INDEX IF EXISTS idx_automation_rules_enabled;
DROP INDEX IF EXISTS idx_automation_rules_tenant;
DROP INDEX IF EXISTS idx_automation_rules_device;

DROP TABLE IF EXISTS rule_actions;
DROP TABLE IF EXISTS rule_conditions;
DROP TABLE IF EXISTS automation_rules;

COMMIT;
