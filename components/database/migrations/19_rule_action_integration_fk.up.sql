BEGIN;

-- Back-fill safety: null out any integration_id that does not reference an
-- existing integration so the new FK constraint can be added cleanly.
UPDATE rule_actions ra
SET integration_id = NULL
WHERE ra.integration_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM integrations i WHERE i.id = ra.integration_id
  );

-- Enforce referential integrity between a rule action and the integration it
-- invokes. ON DELETE SET NULL: removing an integration clears the reference
-- rather than deleting the rule action (integration_id is nullable).
ALTER TABLE rule_actions
    ADD CONSTRAINT rule_actions_integration_id_fkey
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rule_actions_integration ON rule_actions(integration_id);

COMMIT;
