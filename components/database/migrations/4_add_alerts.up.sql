BEGIN;

-- Alert rules with multi-condition support
CREATE TABLE alert_rules (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    device_id uuid NOT NULL,
    name varchar(256) NOT NULL,
    description text,
    severity varchar(32) DEFAULT 'warning',
    enabled boolean DEFAULT true,
    cooldown_minutes int DEFAULT 15,
    last_triggered_at timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    CONSTRAINT alert_rules_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT alert_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conditions (AND/OR grouping via group_id)
-- Conditions in same group are ANDed, groups are ORed together
CREATE TABLE alert_conditions (
    id uuid PRIMARY KEY,
    alert_rule_id uuid NOT NULL,
    group_id int DEFAULT 0,
    metric_name varchar(128) NOT NULL,
    operator varchar(10) NOT NULL,
    threshold float8 NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT alert_conditions_alert_rule_id_fkey  FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
);

-- Notification channels per alert
CREATE TABLE alert_notifications (
    id uuid PRIMARY KEY,
    alert_rule_id uuid NOT NULL,
    type varchar(32) NOT NULL,
    config jsonb NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT alert_notifications_alert_rule_id_fkey FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
);

-- Alert history/events
CREATE TABLE alert_events (
    id uuid PRIMARY KEY,
    alert_rule_id uuid NOT NULL,
    device_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    triggered_values jsonb NOT NULL,
    status varchar(32) NOT NULL,
    triggered_at timestamp NOT NULL,
    resolved_at timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT alert_events_alert_rule_id_fkey FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
);

-- Indices for efficient querying
CREATE INDEX idx_alert_rules_device ON alert_rules(device_id);
CREATE INDEX idx_alert_rules_tenant ON alert_rules(tenant_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(device_id, enabled) WHERE enabled = true;
CREATE INDEX idx_alert_conditions_rule ON alert_conditions(alert_rule_id);
CREATE INDEX idx_alert_notifications_rule ON alert_notifications(alert_rule_id);
CREATE INDEX idx_alert_events_rule ON alert_events(alert_rule_id, triggered_at DESC);
CREATE INDEX idx_alert_events_device ON alert_events(device_id, triggered_at DESC);
CREATE INDEX idx_alert_events_tenant ON alert_events(tenant_id, triggered_at DESC);

COMMIT;
