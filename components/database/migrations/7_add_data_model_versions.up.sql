BEGIN;

-- Add version tracking to data_models
ALTER TABLE data_models ADD COLUMN current_version integer NOT NULL DEFAULT 1;

-- Create version history table
CREATE TABLE data_model_versions (
    id uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    data_model_id uuid NOT NULL,
    CONSTRAINT data_model_id_fkey FOREIGN KEY (data_model_id) REFERENCES data_models(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    schema jsonb NOT NULL,
    change_description text,
    created_at timestamp NOT NULL DEFAULT NOW(),
    created_by uuid,
    CONSTRAINT created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(data_model_id, version_number)
);

-- Create index for efficient lookups
CREATE INDEX idx_data_model_versions_data_model_id ON data_model_versions(data_model_id);

-- Insert initial version records for existing data models
INSERT INTO data_model_versions (id, data_model_id, version_number, schema, change_description, created_at, created_by)
SELECT
    gen_random_uuid(),
    id,
    1,
    schema,
    'Initial version',
    COALESCE(created_at, NOW()),
    user_id
FROM data_models;

COMMIT;
