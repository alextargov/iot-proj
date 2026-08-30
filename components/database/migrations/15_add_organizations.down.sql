BEGIN;

DROP INDEX IF EXISTS idx_organization_members_user;
DROP INDEX IF EXISTS idx_organization_members_org;
DROP INDEX IF EXISTS idx_organizations_owner;

DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

COMMIT;
