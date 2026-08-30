BEGIN;

-- Hourly downsampled rollups of device_metrics for efficient long-range queries.
-- One row per (device, tenant, metric, hour-bucket) with pre-computed aggregates.
CREATE TABLE device_metrics_hourly (
    device_id uuid NOT NULL,
    tenant_id varchar(256) NOT NULL,
    metric_name varchar(128) NOT NULL,
    bucket timestamp NOT NULL,
    sum_value double precision NOT NULL,
    count_value bigint NOT NULL,
    min_value double precision NOT NULL,
    max_value double precision NOT NULL,
    avg_value double precision NOT NULL,
    unit varchar(32),
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (device_id, metric_name, bucket)
);

CREATE INDEX idx_device_metrics_hourly_device_time
    ON device_metrics_hourly (device_id, metric_name, bucket DESC);
CREATE INDEX idx_device_metrics_hourly_tenant
    ON device_metrics_hourly (tenant_id);

COMMIT;
