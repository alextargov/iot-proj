DROP INDEX IF EXISTS idx_devices_communication_token;
ALTER TABLE devices DROP COLUMN IF EXISTS communication_token;
