BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_devices_tenant_id;
DROP INDEX IF EXISTS idx_widgets_tenant_id;
DROP INDEX IF EXISTS idx_data_models_tenant_id;

-- Revert tenant_id to user_id in devices table
ALTER TABLE devices DROP CONSTRAINT tenant_id_fkey;
ALTER TABLE devices RENAME COLUMN tenant_id TO user_id;
ALTER TABLE devices ADD CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Revert tenant_id to user_id in widgets table
ALTER TABLE widgets DROP CONSTRAINT tenant_id_fkey;
ALTER TABLE widgets RENAME COLUMN tenant_id TO user_id;
ALTER TABLE widgets ADD CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Revert tenant_id to user_id in data_models table
ALTER TABLE data_models DROP CONSTRAINT tenant_id_fkey;
ALTER TABLE data_models RENAME COLUMN tenant_id TO user_id;
ALTER TABLE data_models ADD CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
