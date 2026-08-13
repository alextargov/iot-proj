BEGIN;

-- Rename user_id to tenant_id in devices table
ALTER TABLE devices DROP CONSTRAINT user_id_fkey;
ALTER TABLE devices RENAME COLUMN user_id TO tenant_id;
ALTER TABLE devices ADD CONSTRAINT tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE;

-- Rename user_id to tenant_id in widgets table
ALTER TABLE widgets DROP CONSTRAINT user_id_fkey;
ALTER TABLE widgets RENAME COLUMN user_id TO tenant_id;
ALTER TABLE widgets ADD CONSTRAINT tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE;

-- Rename user_id to tenant_id in data_models table
ALTER TABLE data_models DROP CONSTRAINT user_id_fkey;
ALTER TABLE data_models RENAME COLUMN user_id TO tenant_id;
ALTER TABLE data_models ADD CONSTRAINT tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add indexes for tenant_id columns for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widgets_tenant_id ON widgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_models_tenant_id ON data_models(tenant_id);

COMMIT;
