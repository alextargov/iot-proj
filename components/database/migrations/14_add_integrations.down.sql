BEGIN;

DROP INDEX IF EXISTS idx_integrations_tenant;
DROP TABLE IF EXISTS integrations;

COMMIT;
