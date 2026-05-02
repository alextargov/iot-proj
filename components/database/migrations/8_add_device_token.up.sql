BEGIN;

ALTER TABLE devices ADD COLUMN communication_token varchar(64);
CREATE UNIQUE INDEX idx_devices_communication_token ON devices(communication_token) WHERE communication_token IS NOT NULL;

COMMIT;
