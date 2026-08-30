package retention

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// RollupConfig controls the hourly downsampling job.
type RollupConfig struct {
	Enabled       bool `envconfig:"default=true,APP_METRIC_ROLLUP_ENABLED"`
	IntervalHours int  `envconfig:"default=1,APP_METRIC_ROLLUP_INTERVAL_HOURS"`
	// LookbackHours bounds each run to recent buckets so we don't rescan the
	// whole table; must cover at least the interval plus late-arriving data.
	LookbackHours int `envconfig:"default=3,APP_METRIC_ROLLUP_LOOKBACK_HOURS"`
}

// MetricRoller computes hourly rollups since a given time. Implemented by the
// metric repository.
type MetricRoller interface {
	RollupHourly(ctx context.Context, since time.Time) (int64, error)
}

// RollupJob periodically downsamples raw metrics into hourly rollups so
// long-range dashboards can query pre-aggregated data.
type RollupJob struct {
	cfg      RollupConfig
	roller   MetricRoller
	transact persistence.Transactioner
}

// NewRollup creates a new rollup job.
func NewRollup(cfg RollupConfig, roller MetricRoller, transact persistence.Transactioner) *RollupJob {
	return &RollupJob{cfg: cfg, roller: roller, transact: transact}
}

// Start runs the rollup loop until the context is cancelled. It performs an
// initial rollup on start, then repeats every IntervalHours. No-op when disabled.
func (j *RollupJob) Start(ctx context.Context) {
	if !j.cfg.Enabled {
		logger.C(ctx).Info("Metric rollup job disabled")
		return
	}

	interval := time.Duration(j.cfg.IntervalHours) * time.Hour
	if interval <= 0 {
		interval = time.Hour
	}

	logger.C(ctx).Infof("Starting metric rollup job: every %s, lookback %dh", interval, j.cfg.LookbackHours)

	j.runOnce(ctx)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.C(ctx).Info("Stopping metric rollup job")
			return
		case <-ticker.C:
			j.runOnce(ctx)
		}
	}
}

func (j *RollupJob) runOnce(ctx context.Context) {
	lookback := j.cfg.LookbackHours
	if lookback <= 0 {
		lookback = 3
	}
	since := time.Now().Add(-time.Duration(lookback) * time.Hour)

	tx, err := j.transact.Begin()
	if err != nil {
		logger.C(ctx).Errorf("rollup: failed to begin tx: %v", err)
		return
	}
	defer j.transact.RollbackUnlessCommitted(ctx, tx)
	rollupCtx := persistence.SaveToContext(ctx, tx)

	written, err := j.roller.RollupHourly(rollupCtx, since)
	if err != nil {
		logger.C(ctx).Errorf("rollup: failed to compute hourly rollups: %v", err)
		return
	}

	if err := tx.Commit(); err != nil {
		logger.C(ctx).Errorf("rollup: failed to commit: %v", err)
		return
	}

	logger.C(ctx).Infof("rollup: wrote %d hourly rollup rows since %s", written, since.Format(time.RFC3339))
}
