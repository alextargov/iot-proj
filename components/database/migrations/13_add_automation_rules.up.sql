BEGIN;

-- Automation rules: visual IF-THEN automations (WHEN conditions THEN actions).
-- Distinct from alert_rules: rules perform actions (device operations, delays,
-- notifications) rather than only firing notifications.
CREATE TABLE automation_rules (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    device_id uuid NOT NULL,
    name varchar(256) NOT NULL,
    description text,
    enabled boolean DEFAULT true,
    cooldown_seconds int DEFAULT 60,
    last_triggered_at timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    CONSTRAINT automation_rules_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT automation_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conditions (AND within a group_id, OR across groups) — mirrors alert_conditions.
CREATE TABLE rule_conditions (
    id uuid PRIMARY KEY,
    rule_id uuid NOT NULL,
    group_id int DEFAULT 0,
    metric_name varchar(128) NOT NULL,
    operator varchar(10) NOT NULL,
    threshold float8 NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rule_conditions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

-- Ordered actions executed when the rule fires.
CREATE TABLE rule_actions (
    id uuid PRIMARY KEY,
    rule_id uuid NOT NULL,
    seq_order int NOT NULL DEFAULT 0,
    action_type varchar(32) NOT NULL,
    target_device_id uuid,
    operation varchar(32),
    notification_type varchar(32),
    notification_config jsonb,
    delay_seconds int DEFAULT 0,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rule_actions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_automation_rules_device ON automation_rules(device_id);
CREATE INDEX idx_automation_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX idx_automation_rules_enabled ON automation_rules(device_id, enabled) WHERE enabled = true;
CREATE INDEX idx_rule_conditions_rule ON rule_conditions(rule_id);
CREATE INDEX idx_rule_actions_rule ON rule_actions(rule_id, seq_order);

COMMIT;
