BEGIN;
ALTER TABLE widgets ADD COLUMN schedule varchar(64);
ALTER TABLE widgets ADD COLUMN last_executed_at timestamp;
COMMIT;