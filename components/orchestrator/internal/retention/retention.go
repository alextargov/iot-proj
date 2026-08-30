package retention

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// Config controls the metric retention cleanup job.
type Config struct {
	Enabled       bool `envconfig:"default=true,APP_METRIC_RETENTION_ENABLED"`
	RetentionDays int  `envconfig:"default=90,APP_METRIC_RETENTION_DAYS"`
	// IntervalHours is how often the cleanup runs.
	IntervalHours int `envconfig:"default=24,APP_METRIC_RETENTION_INTERVAL_HOURS"`
}

// MetricPurger deletes metrics older than a cutoff. Implemented by the metric
// repository.
type MetricPurger interface {
	DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error)
}

// Job periodically purges metrics older than the configured retention window.
type Job struct {
	cfg      Config
	purger   MetricPurger
	transact persistence.Transactioner
}

// New creates a new retention job.
func New(cfg Config, purger MetricPurger, transact persistence.Transactioner) *Job {
	return &Job{cfg: cfg, purger: purger, transact: transact}
}

// Start runs the retention loop until the context is cancelled. It performs an
// initial cleanup on start, then repeats every IntervalHours. It is a no-op
// when retention is disabled.
func (j *Job) Start(ctx context.Context) {
	if !j.cfg.Enabled {
		logger.C(ctx).Info("Metric retention job disabled")
		return
	}
	if j.cfg.RetentionDays <= 0 {
		logger.C(ctx).Warn("Metric retention days <= 0; retention job will not run")
		return
	}

	interval := time.Duration(j.cfg.IntervalHours) * time.Hour
	if interval <= 0 {
		interval = 24 * time.Hour
	}

	logger.C(ctx).Infof("Starting metric retention job: keep %d days, run every %s", j.cfg.RetentionDays, interval)

	j.runOnce(ctx)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.C(ctx).Info("Stopping metric retention job")
			return
		case <-ticker.C:
			j.runOnce(ctx)
		}
	}
}

func (j *Job) runOnce(ctx context.Context) {
	cutoff := time.Now().AddDate(0, 0, -j.cfg.RetentionDays)

	tx, err := j.transact.Begin()
	if err != nil {
		logger.C(ctx).Errorf("retention: failed to begin tx: %v", err)
		return
	}
	defer j.transact.RollbackUnlessCommitted(ctx, tx)
	cleanupCtx := persistence.SaveToContext(ctx, tx)

	deleted, err := j.purger.DeleteOlderThan(cleanupCtx, cutoff)
	if err != nil {
		logger.C(ctx).Errorf("retention: failed to delete old metrics: %v", err)
		return
	}

	if err := tx.Commit(); err != nil {
		logger.C(ctx).Errorf("retention: failed to commit: %v", err)
		return
	}

	logger.C(ctx).Infof("retention: purged %d metrics older than %s", deleted, cutoff.Format(time.RFC3339))
}
