BEGIN;

ALTER TABLE rule_actions DROP COLUMN IF EXISTS integration_id;

COMMIT;
