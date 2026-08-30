BEGIN;

-- Managed mTLS client certificates issued to devices by the platform CA.
ALTER TABLE devices ADD COLUMN client_cert text;
ALTER TABLE devices ADD COLUMN client_cert_key text;
ALTER TABLE devices ADD COLUMN client_cert_serial varchar(64);
ALTER TABLE devices ADD COLUMN client_cert_expires_at timestamp;

COMMIT;
