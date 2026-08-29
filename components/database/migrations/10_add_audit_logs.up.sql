-- Audit logs table for tracking all mutations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,           -- CREATE, UPDATE, DELETE
    resource_type VARCHAR(100) NOT NULL,   -- Device, Widget, DataModel, AlertRule, etc.
    resource_id UUID,                       -- ID of the affected resource (nullable for failed operations)
    resource_name VARCHAR(255),            -- Human-readable name of the resource
    details JSONB,                         -- Additional context (old values, new values, etc.)
    ip_address VARCHAR(45),                -- Client IP address (IPv4 or IPv6)
    user_agent TEXT,                       -- Client user agent
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILURE
    error_message TEXT,                    -- Error message if status is FAILURE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for filtering by tenant and time range
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail for all mutation operations';
COMMENT ON COLUMN audit_logs.action IS 'Type of operation: CREATE, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected: Device, Widget, DataModel, AlertRule, DashboardLayout, DashboardWidget';
COMMENT ON COLUMN audit_logs.details IS 'JSON object containing operation-specific details like changed fields';
