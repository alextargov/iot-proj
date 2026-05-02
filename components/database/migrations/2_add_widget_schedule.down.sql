BEGIN;

ALTER TABLE widgets DROP COLUMN schedule;
ALTER TABLE widgets DROP COLUMN last_executed_at;

COMMIT;
