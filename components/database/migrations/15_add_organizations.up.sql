BEGIN;

-- Organizations (teams/workspaces) as an overlay on the existing per-user
-- tenancy. Data ownership stays keyed by tenant_id == users.id; organizations
-- group users and carry per-member roles for collaboration/administration.
CREATE TABLE organizations (
    id uuid PRIMARY KEY,
    name varchar(256) NOT NULL,
    owner_user_id uuid NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    CONSTRAINT organizations_owner_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE organization_members (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role varchar(32) NOT NULL DEFAULT 'VIEWER',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organization_members_org_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT organization_members_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT organization_members_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);

COMMIT;
