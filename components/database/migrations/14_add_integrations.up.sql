BEGIN;

-- External-service integrations (webhook / IFTTT / Home Assistant / generic HTTP).
CREATE TABLE integrations (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name varchar(256) NOT NULL,
    type varchar(32) NOT NULL,
    endpoint text NOT NULL,
    auth_token text,
    config jsonb,
    enabled boolean DEFAULT true,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    CONSTRAINT integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);

COMMIT;
