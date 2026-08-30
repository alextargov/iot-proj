BEGIN;

-- Allow a rule action to invoke a configured integration (INTEGRATION action type).
ALTER TABLE rule_actions ADD COLUMN integration_id uuid;

COMMIT;
