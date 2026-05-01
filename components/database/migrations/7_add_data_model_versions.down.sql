-- Remove version history table
DROP TABLE IF EXISTS data_model_versions;

-- Remove version column from data_models
ALTER TABLE data_models DROP COLUMN IF EXISTS current_version;
