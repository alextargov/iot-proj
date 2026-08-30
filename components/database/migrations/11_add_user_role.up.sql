BEGIN;

-- Add role column for RBAC. New users default to VIEWER (least privilege);
-- existing users are backfilled to ADMIN so current behavior is preserved.
ALTER TABLE users ADD COLUMN role varchar(32) NOT NULL DEFAULT 'VIEWER';
UPDATE users SET role = 'ADMIN';

COMMIT;
