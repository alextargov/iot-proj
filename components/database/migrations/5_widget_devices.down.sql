-- Add back device_ids column to widgets table
ALTER TABLE widgets ADD COLUMN device_ids jsonb;

-- Migrate data back from junction table to JSONB array
UPDATE widgets w
SET device_ids = (
    SELECT jsonb_agg(wd.device_id)
    FROM widget_devices wd
    WHERE wd.widget_id = w.id
);

-- Set empty array for widgets with no devices
UPDATE widgets
SET device_ids = '[]'::jsonb
WHERE device_ids IS NULL;

-- Drop indices
DROP INDEX IF EXISTS idx_widget_devices_widget;
DROP INDEX IF EXISTS idx_widget_devices_device;

-- Drop the junction table
DROP TABLE IF EXISTS widget_devices;