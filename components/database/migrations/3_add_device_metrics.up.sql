BEGIN;

CREATE TABLE device_metrics (
    id varchar(256) PRIMARY KEY,
    device_id uuid NOT NULL,
    tenant_id varchar(256) NOT NULL,
    metric_name varchar(128) NOT NULL,
    metric_value double precision NOT NULL,
    unit varchar(32),
    recorded_at timestamp NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_device_metrics_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_device_metrics_device_time ON device_metrics(device_id, recorded_at DESC);
CREATE INDEX idx_device_metrics_tenant ON device_metrics(tenant_id);
CREATE INDEX idx_device_metrics_name ON device_metrics(device_id, metric_name, recorded_at DESC);

COMMIT;
