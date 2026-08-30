BEGIN;

DROP INDEX IF EXISTS idx_device_metrics_hourly_tenant;
DROP INDEX IF EXISTS idx_device_metrics_hourly_device_time;
DROP TABLE IF EXISTS device_metrics_hourly;

COMMIT;
