BEGIN;

ALTER TABLE devices DROP COLUMN IF EXISTS client_cert_expires_at;
ALTER TABLE devices DROP COLUMN IF EXISTS client_cert_serial;
ALTER TABLE devices DROP COLUMN IF EXISTS client_cert_key;
ALTER TABLE devices DROP COLUMN IF EXISTS client_cert;

COMMIT;
