BEGIN;

-- Retention support: a BRIN index on recorded_at makes the time-range delete
-- performed by the retention job (DELETE ... WHERE recorded_at < cutoff)
-- efficient on the append-only device_metrics table without the write overhead
-- of a full B-tree.
CREATE INDEX IF NOT EXISTS idx_device_metrics_recorded_at_brin
    ON device_metrics USING BRIN (recorded_at);

COMMIT;
