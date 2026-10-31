BEGIN;

DROP INDEX IF EXISTS idx_rule_actions_integration;

ALTER TABLE rule_actions
    DROP CONSTRAINT IF EXISTS rule_actions_integration_id_fkey;

COMMIT;
