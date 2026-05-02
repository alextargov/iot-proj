BEGIN;

-- Create widget_devices junction table for many-to-many relationship
CREATE TABLE widget_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id uuid NOT NULL,
    device_id uuid NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT widget_devices_widget_id_fkey FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE,
    CONSTRAINT widget_devices_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT widget_devices_unique UNIQUE (widget_id, device_id)
);

-- Create indices for efficient querying
CREATE INDEX idx_widget_devices_widget ON widget_devices(widget_id);
CREATE INDEX idx_widget_devices_device ON widget_devices(device_id);

-- Migrate existing data from device_ids JSONB to junction table
INSERT INTO widget_devices (widget_id, device_id, created_at)
SELECT
    w.id as widget_id,
    (jsonb_array_elements_text(w.device_ids))::uuid as device_id,
    w.created_at
FROM widgets w
WHERE w.device_ids IS NOT NULL
  AND w.device_ids != 'null'::jsonb
  AND jsonb_array_length(w.device_ids) > 0;

-- Drop the device_ids column from widgets table
ALTER TABLE widgets DROP COLUMN device_ids;

COMMIT;